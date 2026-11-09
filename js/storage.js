
/* =========================================================
   1. GLOBALS
========================================================= */

let currentUserId = null;

let allInventoryItems = [];


let inventoryItemNames = [];


/* =========================================================
   SUPPLIERS
========================================================= */

let allSuppliers = [];

let editingSupplierId = null;
/* =========================================================
   2. AUTH
========================================================= */

async function initUser(){

    try{

        const {
            data
        } =
        await supabaseClient
        .auth
        .getUser();


        currentUserId =
            data?.user?.id ?? null;


    }catch(error){

        console.error(
            "Auth error:",
            error
        );

        currentUserId =
            null;

    }


    return currentUserId;

}


async function getUserId(){

    if(currentUserId){

        return currentUserId;

    }

    return await initUser();

}


async function logout(){

    await supabaseClient
    .auth
    .signOut();

    window.location.replace(
        "login.html"
    );

}

/* =========================================================
   SUPPLIER MANAGEMENT
========================================================= */


/* =========================================================
   OPEN SUPPLIERS MODAL
========================================================= */

async function openSuppliersModal(){

    const modal =
        document.getElementById(
            "suppliersModal"
        );

    if(!modal){

        console.error(
            "Suppliers modal not found"
        );

        return;

    }


    modal.style.display =
        "flex";


    closeSupplierForm();


    await loadSuppliers();

}


/* =========================================================
   CLOSE SUPPLIERS MODAL
========================================================= */

function closeSuppliersModal(){

    const modal =
        document.getElementById(
            "suppliersModal"
        );

    if(modal){

        modal.style.display =
            "none";

    }

}


/* =========================================================
   LOAD SUPPLIERS
========================================================= */

async function loadSuppliers(){

    const userId =
        await getUserId();

    if(!userId){

        return;

    }


    const container =
        document.getElementById(
            "suppliersList"
        );

    if(!container){

        return;

    }


    container.innerHTML = `

        <div class="storage-loading">

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Loading suppliers...

        </div>

    `;


    const {
        data,
        error
    } =
    await supabaseClient

        .from(
            "suppliers"
        )

        .select(`
            id,
            supplier_name,
            phone,
            email,
            address,
            notes,
            created_at,
            updated_at
        `)

        .eq(
            "user_id",
            userId
        )

        .order(
            "supplier_name",
            {
                ascending:true
            }
        );


    if(error){

        console.error(
            "Suppliers load error:",
            error
        );

        container.innerHTML = `

            <div class="storage-error">

                Failed to load suppliers

            </div>

        `;

        showToast(
            error.message
        );

        return;

    }


    allSuppliers =
        data || [];


    renderSuppliers(
        allSuppliers
    );

}


/* =========================================================
   RENDER SUPPLIERS
========================================================= */

function renderSuppliers(
    suppliers
){

    const container =
        document.getElementById(
            "suppliersList"
        );

    if(!container){

        return;

    }


    if(!suppliers.length){

        container.innerHTML = `

            <div class="inventory-empty">

                <div
                    class="inventory-empty-icon"
                >

                    <i
                        class="fa-solid fa-truck-field"
                    ></i>

                </div>


                <div>

                    <strong>
                        No suppliers
                    </strong>

                    <span>
                        لم تتم إضافة أي مورد حتى الآن
                    </span>

                </div>

            </div>

        `;

        return;

    }


  container.innerHTML =

    suppliers.map(
        supplier => {

            const name =
                escapeHtml(
                    supplier.supplier_name
                );

            const phone =
                escapeHtml(
                    supplier.phone || ""
                );

            const email =
                escapeHtml(
                    supplier.email || ""
                );

            const address =
                escapeHtml(
                    supplier.address || ""
                );

            return `

                <div class="supplier-row">

                    <!-- =====================================
                         SUPPLIER
                    ====================================== -->

                    <div class="supplier-row-supplier">

                        <div class="supplier-avatar">

                            <i class="
                                fa-solid
                                fa-truck-field
                            "></i>

                        </div>

                        <div class="supplier-name">

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                #${supplier.id}
                            </small>

                        </div>

                    </div>


                    <!-- =====================================
                         PHONE
                    ====================================== -->

                    <div class="supplier-row-field">

                        <span class="supplier-field-label">
                            Phone
                        </span>

                        <span class="
                            supplier-field-value
                            ${!phone ? "empty" : ""}
                        ">

                            ${
                                phone
                                ||
                                "Not provided"
                            }

                        </span>

                    </div>


                    <!-- =====================================
                         EMAIL
                    ====================================== -->

                    <div class="supplier-row-field">

                        <span class="supplier-field-label">
                            Email
                        </span>

                        <span class="
                            supplier-field-value
                            ${!email ? "empty" : ""}
                        ">

                            ${
                                email
                                ||
                                "Not provided"
                            }

                        </span>

                    </div>


                    <!-- =====================================
                         ADDRESS
                    ====================================== -->

                    <div class="
                        supplier-row-field
                        supplier-row-address
                    ">

                        <span class="supplier-field-label">
                            Address
                        </span>

                        <span class="
                            supplier-field-value
                            ${!address ? "empty" : ""}
                        ">

                            ${
                                address
                                ||
                                "Not provided"
                            }

                        </span>

                    </div>


                    <!-- =====================================
                         STATUS
                    ====================================== -->

                    <div class="supplier-row-status">

                        <span>

                            <i class="
                                fa-solid
                                fa-circle-check
                            "></i>

                            Active

                        </span>

                    </div>


                    <!-- =====================================
                         ACTIONS
                    ====================================== -->

                    <div class="supplier-row-actions">

                        <button
                            type="button"
                            class="
                                supplier-action
                                edit
                            "
                            onclick="
                                editSupplier(
                                    ${supplier.id}
                                )
                            "
                            title="Edit Supplier"
                        >

                            <i class="
                                fa-solid
                                fa-pen
                            "></i>

                        </button>


                        <button
                            type="button"
                            class="
                                supplier-action
                                delete
                            "
                            onclick="
                                deleteSupplier(
                                    ${supplier.id}
                                )
                            "
                            title="Delete Supplier"
                        >

                            <i class="
                                fa-solid
                                fa-trash
                            "></i>

                        </button>

                    </div>

                </div>

            `;

        }
    ).join("");

}


/* =========================================================
   OPEN ADD SUPPLIER FORM
========================================================= */

function openAddSupplierForm(){

    editingSupplierId =
        null;


    const form =
        document.getElementById(
            "supplierForm"
        );

    if(!form){

        return;

    }


    form.style.display =
        "block";


    clearSupplierForm();


    setTimeout(
        () => {

            document
                .getElementById(
                    "supplierName"
                )
                ?.focus();

        },
        100
    );

}


/* =========================================================
   CLOSE SUPPLIER FORM
========================================================= */

function closeSupplierForm(){

    const form =
        document.getElementById(
            "supplierForm"
        );

    if(form){

        form.style.display =
            "none";

    }


    editingSupplierId =
        null;


    clearSupplierForm();

}


/* =========================================================
   CLEAR SUPPLIER FORM
========================================================= */

function clearSupplierForm(){

    const fields = [

        "supplierId",

        "supplierName",

        "supplierPhone",

        "supplierEmail",

        "supplierAddress",

        "supplierNotes"

    ];


    fields.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if(element){

                element.value =
                    "";

            }

        }
    );

}


/* =========================================================
   SAVE SUPPLIER
========================================================= */

async function saveSupplier(){

    const userId =
        await getUserId();

    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    const name =
        document
            .getElementById(
                "supplierName"
            )
            ?.value
            ?.trim();


    const phone =
        document
            .getElementById(
                "supplierPhone"
            )
            ?.value
            ?.trim()
            || null;


    const email =
        document
            .getElementById(
                "supplierEmail"
            )
            ?.value
            ?.trim()
            || null;


    const address =
        document
            .getElementById(
                "supplierAddress"
            )
            ?.value
            ?.trim()
            || null;


    const notes =
        document
            .getElementById(
                "supplierNotes"
            )
            ?.value
            ?.trim()
            || null;


    /* =====================================================
       VALIDATION
    ===================================================== */

    if(!name){

        showToast(
            "Enter supplier name"
        );

        document
            .getElementById(
                "supplierName"
            )
            ?.focus();

        return;

    }


    /* =====================================================
       EDIT
    ===================================================== */

    if(editingSupplierId){

        const {
            error
        } =
        await supabaseClient

            .from(
                "suppliers"
            )

            .update({

                supplier_name:
                    name,

                phone:
                    phone,

                email:
                    email,

                address:
                    address,

                notes:
                    notes,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                editingSupplierId
            )

            .eq(
                "user_id",
                userId
            );


        if(error){

            console.error(
                "Update supplier error:",
                error
            );

            showToast(
                error.message
            );

            return;

        }


        showToast(
            "Supplier updated"
        );

    }


    /* =====================================================
       CREATE
    ===================================================== */

    else{

        const {
            error
        } =
        await supabaseClient

            .from(
                "suppliers"
            )

            .insert({

                user_id:
                    userId,

                supplier_name:
                    name,

                phone:
                    phone,

                email:
                    email,

                address:
                    address,

                notes:
                    notes

            });


        if(error){

            console.error(
                "Create supplier error:",
                error
            );

            showToast(
                error.message
            );

            return;

        }


        showToast(
            "Supplier added"
        );

    }


    closeSupplierForm();


    await loadSuppliers();

}


/* =========================================================
   EDIT SUPPLIER
========================================================= */

function editSupplier(
    supplierId
){

    const supplier =
        allSuppliers.find(
            item =>
                Number(item.id) ===
                Number(supplierId)
        );


    if(!supplier){

        showToast(
            "Supplier not found"
        );

        return;

    }


    editingSupplierId =
        supplier.id;


    document
        .getElementById(
            "supplierId"
        )
        .value =
            supplier.id;


    document
        .getElementById(
            "supplierName"
        )
        .value =
            supplier.supplier_name || "";


    document
        .getElementById(
            "supplierPhone"
        )
        .value =
            supplier.phone || "";


    document
        .getElementById(
            "supplierEmail"
        )
        .value =
            supplier.email || "";


    document
        .getElementById(
            "supplierAddress"
        )
        .value =
            supplier.address || "";


    document
        .getElementById(
            "supplierNotes"
        )
        .value =
            supplier.notes || "";


    const form =
        document.getElementById(
            "supplierForm"
        );


    if(form){

        form.style.display =
            "block";

    }


    document
        .getElementById(
            "supplierName"
        )
        ?.focus();

}


/* =========================================================
   DELETE SUPPLIER
========================================================= */

async function deleteSupplier(
    supplierId
){

    const supplier =
        allSuppliers.find(
            item =>
                Number(item.id) ===
                Number(supplierId)
        );


    if(!supplier){

        showToast(
            "Supplier not found"
        );

        return;

    }


    const confirmed =
        await showConfirm(
            `Delete supplier "${supplier.supplier_name}"?`
        );


    if(!confirmed){

        return;

    }


    const userId =
        await getUserId();

    if(!userId){

        return;

    }


    const {
        error
    } =
    await supabaseClient

        .from(
            "suppliers"
        )

        .delete()

        .eq(
            "id",
            supplierId
        )

        .eq(
            "user_id",
            userId
        );


    if(error){

        console.error(
            "Delete supplier error:",
            error
        );


        /*
           If the supplier has purchase invoices,
           ON DELETE RESTRICT will prevent deletion.
        */

        showToast(
            error.message
        );

        return;

    }


    showToast(
        "Supplier deleted"
    );


    await loadSuppliers();

}


/* =========================================================
   FILTER SUPPLIERS
========================================================= */

function filterSuppliers(){

    const value =
        document
            .getElementById(
                "supplierSearch"
            )
            ?.value
            ?.toLowerCase()
            ?.trim()
            || "";


    const filtered =
        allSuppliers.filter(
            supplier => {

                const name =
                    String(
                        supplier.supplier_name || ""
                    )
                    .toLowerCase();


                const phone =
                    String(
                        supplier.phone || ""
                    )
                    .toLowerCase();


                const email =
                    String(
                        supplier.email || ""
                    )
                    .toLowerCase();


                return (

                    name.includes(value)

                    ||

                    phone.includes(value)

                    ||

                    email.includes(value)

                );

            }
        );


    renderSuppliers(
        filtered
    );

}

/* =========================================================
   3. TOAST
========================================================= */

function showToast(message){

    const toast =
        document.getElementById(
            "toast"
        );

    if(!toast) return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(()=>{

        toast.classList.remove(
            "show"
        );

    },3000);

}


/* =========================================================
   4. LOAD INVENTORY
========================================================= */
/* =========================================================
   INVENTORY ITEM NAME AUTOCOMPLETE
========================================================= */




/* =========================================================
   PURCHASE INVOICE — LOAD EXISTING ITEM NAMES
========================================================= */

async function loadInventoryItemNames(){

    const userId =
        await getUserId();

    if(!userId) return;


    const {
        data,
        error
    } =
    await supabaseClient

        .from("inventory_items")

        .select("item_name")

        .eq(
            "user_id",
            userId
        )

        .order(
            "item_name",
            {
                ascending:true
            }
        );


    if(error){

        console.error(
            "Inventory item names error:",
            error
        );

        return;

    }


    /* =====================================================
       REMOVE DUPLICATES
    ===================================================== */

    const uniqueNames =
        new Map();


    (data || []).forEach(item => {

        const name =
            String(
                item.item_name || ""
            ).trim();


        if(!name) return;


        const key =
            name.toLowerCase();


        if(!uniqueNames.has(key)){

            uniqueNames.set(
                key,
                name
            );

        }

    });


    inventoryItemNames =
        [...uniqueNames.values()];



    console.log(
        "Inventory item names loaded:",
        inventoryItemNames.length
    );

}


/* =========================================================
   HANDLE PURCHASE ITEM NAME INPUT
========================================================= */

function handleInventoryItemNameInput(input){

    if(!input) return;


    /*
       Find the suggestions container belonging
       to THIS purchase item row.
    */

    const row =
        input.closest(
            ".purchase-invoice-item"
        );


    if(!row) return;


    const suggestions =
        row.querySelector(
            ".inventory-item-suggestions"
        );


    if(!suggestions) return;


    const search =
        String(
            input.value || ""
        )
        .trim()
        .toLowerCase();


    /* =====================================================
       EMPTY INPUT
    ===================================================== */

    if(!search){

        suggestions.innerHTML = "";

        suggestions.style.display =
            "none";

        return;

    }


    /* =====================================================
       SEARCH EXISTING ITEMS
    ===================================================== */

    const matches =
        (inventoryItemNames || [])

            .filter(name => {

                return name
                    .toLowerCase()
                    .includes(search);

            })

            .slice(0,8);


    /* =====================================================
       NO RESULTS
    ===================================================== */

    if(!matches.length){

        suggestions.innerHTML = "";

        suggestions.style.display =
            "none";

        return;

    }


    /* =====================================================
       RENDER
    ===================================================== */

    suggestions.innerHTML =

        matches.map(
            name => `

                <button
                    type="button"
                    class="inventory-suggestion"
                    data-item-name="${escapeHtml(name)}"
                >

                    <i
                        class="
                            fa-solid
                            fa-box
                        "
                    ></i>

                    <span>
                        ${escapeHtml(name)}
                    </span>

                </button>

            `
        ).join("");


    suggestions.style.display =
        "block";

}


/* =========================================================
   SELECT SUGGESTION
========================================================= */

function selectInventoryItemName(
    name,
    input
){

    if(!input) return;


    /* =====================================================
       PUT NAME INTO INPUT
    ===================================================== */

    input.value =
        String(name || "");


    /* =====================================================
       FIND CURRENT ROW
    ===================================================== */

    const row =
        input.closest(
            ".purchase-invoice-item"
        );


    if(row){

        const suggestions =
            row.querySelector(
                ".inventory-item-suggestions"
            );


        if(suggestions){

            suggestions.innerHTML = "";

            suggestions.style.display =
                "none";

        }

    }


    /* =====================================================
       KEEP CURSOR IN INPUT
    ===================================================== */

    input.focus();

}


/* =========================================================
   PURCHASE ITEM SUGGESTION CLICK
   Event Delegation
========================================================= */

document.addEventListener(
    "click",
    function(event){

        const suggestion =
            event.target.closest(
                ".inventory-suggestion"
            );


        if(!suggestion) return;


        event.preventDefault();


        const row =
            suggestion.closest(
                ".purchase-invoice-item"
            );


        if(!row) return;


        const input =
            row.querySelector(
                ".purchase-item-name"
            );


        const name =
            suggestion
                .querySelector("span")
                ?.textContent
                ?.trim();


        if(
            name &&
            input
        ){

            selectInventoryItemName(
                name,
                input
            );

        }

    }
);


/* =========================================================
   CLOSE SUGGESTIONS WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    function(event){

        document
            .querySelectorAll(
                ".inventory-item-suggestions"
            )
            .forEach(
                suggestions => {

                    const row =
                        suggestions.closest(
                            ".purchase-invoice-item"
                        );


                    if(!row) return;


                    const input =
                        row.querySelector(
                            ".purchase-item-name"
                        );


                    if(
                        event.target !== input &&
                        !suggestions.contains(
                            event.target
                        )
                    ){

                        suggestions.innerHTML = "";

                        suggestions.style.display =
                            "none";

                    }

                }
            );

    }
);


/* =========================================================
   REFRESH NAMES
========================================================= */

async function refreshInventoryItemNames(){

    await loadInventoryItemNames();

}


/* =========================================================
   REFRESH AFTER ADDING NEW ITEM
========================================================= */

async function refreshInventoryAutocomplete(){

    await loadInventoryItemNames();

}
/* =========================================================
   4. LOAD INVENTORY
========================================================= */

async function loadInventory(){

    const userId =
        await getUserId();

    if(!userId) return;


    /* =====================================================
       CURRENT MONTH RANGE
    ===================================================== */

    const now = new Date();

    const startOfMonth =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0
        );

    const startOfNextMonth =
        new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1,
            0,
            0,
            0,
            0
        );


    /* =====================================================
       LOAD INVENTORY ITEMS
    ===================================================== */

    const {
        data,
        error
    } =
    await supabaseClient

        .from(
            "inventory_items"
        )

        .select(`
            id,
            item_name,
            quantity,
            purchased_quantity,
            unit_price,
            low_stock_threshold
        `)

        .eq(
            "user_id",
            userId
        )

        .order(
            "id",
            {
                ascending:false
            }
        );


    if(error){

        console.error(
            "Inventory error:",
            error
        );

        showToast(
            error.message
        );

        return;

    }


    /* =====================================================
       LOAD PURCHASE HISTORY
    ===================================================== */

    const {
        data: purchases,
        error: purchasesError
    } =
    await supabaseClient

        .from(
            "inventory_purchases"
        )

        .select(`
            id,
            inventory_item_id,
            purchased_quantity,
            unit_price,
            total_purchase_price,
            created_at
        `)

        .eq(
            "user_id",
            userId
        )

        .order(
            "created_at",
            {
                ascending:true
            }
        );


    if(purchasesError){

        console.error(
            "Inventory purchases error:",
            purchasesError
        );

        showToast(
            purchasesError.message
        );

        return;

    }


    /* =====================================================
       CALCULATIONS
    ===================================================== */

    /*
       إجمالي تكلفة جميع المشتريات
    */
    const purchaseTotals = {};


    /*
       جميع دفعات الشراء
       لاستخدامها في عرض آخر 3 عمليات
    */
    const purchaseBatches = {};


    /*
       الكمية المشتراة خلال الشهر الحالي فقط
    */
    const monthlyPurchased = {};


    /*
       تكلفة المشتريات خلال الشهر الحالي فقط
    */
    const monthlyPurchaseCost = {};


    /* =====================================================
       PROCESS PURCHASES
    ===================================================== */

    (purchases || []).forEach(
        purchase => {

            const itemId =
                Number(
                    purchase.inventory_item_id
                );


            const quantity =
                Number(
                    purchase.purchased_quantity || 0
                );


            const price =
                Number(
                    purchase.unit_price || 0
                );


            /*
               نحسب التكلفة من:

               quantity × unit_price

               حتى لو total_purchase_price
               كان NULL
            */
            const cost =
                quantity * price;


            /* =============================================
               TOTAL HISTORICAL PURCHASE COST
            ============================================= */

            if(!purchaseTotals[itemId]){

                purchaseTotals[itemId] = 0;

            }


            purchaseTotals[itemId] +=
                cost;


            /* =============================================
               PURCHASE BATCHES
            ============================================= */

            if(!purchaseBatches[itemId]){

                purchaseBatches[itemId] = [];

            }


            purchaseBatches[itemId].push({

                quantity:
                    quantity,

                unit_price:
                    price,

                total:
                    cost,

                created_at:
                    purchase.created_at

            });


            /* =============================================
               PURCHASE DATE
            ============================================= */

            const purchaseDate =
                purchase.created_at
                    ? new Date(
                        purchase.created_at
                    )
                    : null;


            /* =============================================
               CURRENT MONTH
            ============================================= */

            if(
                purchaseDate &&
                purchaseDate >= startOfMonth &&
                purchaseDate < startOfNextMonth
            ){

                /* =========================================
                   MONTHLY PURCHASED QUANTITY
                ========================================= */

                if(
                    !monthlyPurchased[itemId]
                ){

                    monthlyPurchased[itemId] = 0;

                }


                monthlyPurchased[itemId] +=
                    quantity;


                /* =========================================
                   MONTHLY PURCHASE COST
                ========================================= */

                if(
                    !monthlyPurchaseCost[itemId]
                ){

                    monthlyPurchaseCost[itemId] = 0;

                }


                monthlyPurchaseCost[itemId] +=
                    cost;

            }

        }
    );


    /* =====================================================
       MERGE DATA
    ===================================================== */

    allInventoryItems =
        (data || []).map(
            item => {

                const itemId =
                    Number(
                        item.id
                    );


                return {

                    ...item,


                    /* =====================================
                       TOTAL HISTORICAL COST
                    ===================================== */

                    total_purchase_cost:
                        purchaseTotals[itemId]
                        || 0,


                    /* =====================================
                       MONTHLY PURCHASED QUANTITY
                    ===================================== */

                    monthly_purchased_quantity:
                        monthlyPurchased[itemId]
                        || 0,


                    /* =====================================
                       MONTHLY PURCHASE COST
                    ===================================== */

                    monthly_purchase_cost:
                        monthlyPurchaseCost[itemId]
                        || 0,


                    /* =====================================
                       PURCHASE HISTORY
                    ===================================== */

                    purchase_batches:
                        purchaseBatches[itemId]
                        || []

                };

            }
        );


    /* =====================================================
       RENDER INVENTORY
    ===================================================== */

    renderInventory(
        allInventoryItems
    );


    /* =====================================================
       UPDATE INVENTORY STATS
    ===================================================== */

    updateInventoryStats();

}


/* =========================================================
   5. RENDER INVENTORY
========================================================= */


/* =========================================================
   5. RENDER INVENTORY
========================================================= */


/* =========================================================
   RENDER INVENTORY — MODERN HORIZONTAL DESIGN
========================================================= */

function renderInventory(items){

    const container =
        document.getElementById(
            "inventoryContainer"
        );


    if(!container) return;


    /* =====================================================
       EMPTY
    ===================================================== */

    if(!items.length){

        container.innerHTML = `

            <div
                class="inventory-empty"
            >

                <div
                    class="inventory-empty-icon"
                >

                    <i
                        class="
                            fa-solid
                            fa-box-open
                        "
                    ></i>

                </div>

                <div>

                    <strong data-i18n="401">
                        No inventory items
                    </strong>

                    <span data-i18n="402">
                        No inventory items have been added yet
                    </span>

                </div>

            </div>

        `;

        applyTranslations();
        return;

    }


    /* =====================================================
       RENDER
    ===================================================== */

    container.innerHTML =

        items.map(item => {


            /* =================================================
               BASIC VALUES
            ================================================= */

            const quantity =
                Number(
                    item.quantity || 0
                );


            const purchasedQuantity =
    Number(
        item.monthly_purchased_quantity || 0
    );


            const threshold =
                Number(
                    item.low_stock_threshold || 0
                );


            const totalPurchaseCost =
    Number(
        item.monthly_purchase_cost || 0
    );


            const lowStock =
                quantity <= threshold;


            /* =================================================
               PURCHASE BATCHES
               LAST 3 ONLY
            ================================================= */

            const purchaseBatches =
                item.purchase_batches || [];


            const sortedBatches =
                [...purchaseBatches].reverse();


            const visibleBatches =
                sortedBatches.slice(0,3);


            const hiddenBatchesCount =
                Math.max(
                    sortedBatches.length - 3,
                    0
                );


            /* =================================================
               PURCHASE HISTORY
            ================================================= */

            const batchesHTML =

                visibleBatches.length

                ?

                visibleBatches.map(
                    (batch,index) => {

                        const batchQuantity =
                            Number(
                                batch.quantity || 0
                            );


                        const batchUnitPrice =
                            Number(
                                batch.unit_price || 0
                            );


                        const batchTotal =
                            Number(
                                batch.total || 0
                            );


                        return `

                            <div
                                class="
                                    inventory-batch
                                    ${
                                        index === 0
                                            ? "latest"
                                            : ""
                                    }
                                "
                            >

                                <span
                                    class="
                                        inventory-batch-tag
                                    "
                                >

                                    ${
                                        index === 0
                                            ? `<span data-i18n="403">Latest</span>`
                                            : `#${index + 1}`
                                    }

                                </span>


                                <span
                                    class="
                                        inventory-batch-qty
                                    "
                                >

                                    ${batchQuantity}

                                    ×

                                    ${batchUnitPrice.toLocaleString()}

                                    <span data-i18n="419">EGP</span>

                                </span>


                                <strong
                                    class="
                                        inventory-batch-total
                                    "
                                >

                                    ${batchTotal.toLocaleString()}

                                    <span data-i18n="419">EGP</span>

                                </strong>

                            </div>

                        `;

                    }

                ).join("")

                :

                `

                    <span
                        class="
                            inventory-no-history
                        "
                        data-i18n="404"
                    >

                        No purchase records

                    </span>

                `;


            /* =================================================
               OLD PURCHASES INDICATOR
            ================================================= */

          const olderBatchesHTML =

    hiddenBatchesCount > 0

    ?

    `

        <span
            class="
                inventory-older-count
            "
        >

            +${formatOlderBatchesCount(
                hiddenBatchesCount
            )}

            <span data-i18n="418">older</span>

        </span>

    `

    :

    "";


            /* =================================================
               CARD
            ================================================= */

            return `

                <div
                    class="
                        inventory-row
                        ${
                            lowStock
                                ? "low-stock"
                                : ""
                        }
                    "
                >


                    <!-- =====================================
                         ITEM
                    ====================================== -->

                    <div
                        class="
                            inventory-row-item
                        "
                    >

                        <div
                            class="
                                inventory-item-icon
                        "
                        >

                            <i
                                class="
                                    fa-solid
                                    fa-box
                                "
                            ></i>

                        </div>


                        <div
                            class="
                                inventory-item-info
                            "
                        >

                            <div
                                class="
                                    inventory-item-title
                                "
                            >

                                ${escapeHtml(
                                    item.item_name
                                )}

                            </div>


                            <div
                                class="
                                    inventory-item-status
                                "
                            >

                                ${
                                    lowStock

                                    ?

                                    `

                                    <span
                                        class="
                                            inventory-low-badge
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-triangle-exclamation
                                            "
                                        ></i>

                                        <span data-i18n="405">Low Stock</span>

                                    </span>

                                    `

                                    :

                                    `

                                    <span
                                        class="
                                            inventory-normal-badge
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-circle-check
                                            "
                                        ></i>

                                        <span data-i18n="406">In Stock</span>

                                    </span>

                                    `

                                }

                            </div>

                        </div>

                    </div>



                    <!-- =====================================
                         CURRENT QUANTITY
                    ====================================== -->

                    <div
                        class="
                            inventory-row-stat
                            inventory-current
                        "
                    >

                        <span data-i18n="407">
                            Current
                        </span>


                        <strong>

                            ${quantity}

                        </strong>


                        <small data-i18n="408">

                            units

                        </small>

                    </div>



                    <!-- =====================================
                         PURCHASED
                    ====================================== -->

                    <div
                        class="
                            inventory-row-stat
                        "
                    >

                        <span>
                            <span data-i18n="409">Purchased</span>
                            <br>
                            <span data-i18n="410">(this month)</span>
                        </span>


                        <strong>

                            ${purchasedQuantity}

                        </strong>


                        <small data-i18n="411">
                            total
                        </small>

                    </div>



                    <!-- =====================================
                         PURCHASE PRICES
                    ====================================== -->

                    <div
                        class="
                            inventory-row-prices
                        "
                    >

                        <div
                            class="
                                inventory-section-label
                            "
                        >

                            <i
                                class="
                                    fa-solid
                                    fa-tags
                                "
                            ></i>

                            <span data-i18n="412">Purchase Prices</span>

                        </div>


                        <div
                            class="
                                inventory-batches
                            "
                        >

                            ${batchesHTML}

                            ${olderBatchesHTML}

                        </div>

                    </div>



                    <!-- =====================================
                         TOTAL COST
                    ====================================== -->

                    <div
                        class="
                            inventory-row-cost
                        "
                    >

                        <span>

                            <span data-i18n="413">Total Cost</span>
                            <br>
                            <span data-i18n="410">(this month)</span>

                        </span>


                        <strong>

                            ${totalPurchaseCost.toLocaleString()}

                            <small data-i18n="419">
                                EGP
                            </small>

                        </strong>

                    </div>



                    <!-- =====================================
                         ACTIONS
                    ====================================== -->

                    <div
                        class="
                            inventory-row-actions
                        "
                    >


                        <!-- QUANTITY -->

                        <button
                            type="button"
                            class="
                                inventory-action-btn
                                secondary
                            "
                            onclick="
                                openEditInventoryQuantityModal(
                                    ${item.id}
                                )
                            "
                            title="Edit Quantity - بدون شراء او استهلاك"
                        >

                            <i
                                class="
                                    fa-solid
                                    fa-boxes-stacked
                                "
                            ></i>

                            <span data-i18n="414">
                                Quantity
                            </span>

                        </button>


                        <!-- SERVICES -->

                        <button
                            type="button"
                            class="
                                inventory-action-btn
                                primary
                            "
                            onclick="
                                openUsageModal(
                                    ${item.id}
                                )
                            "
                            title="الخدمات المستهلكة لهذا العنصر"
                        >

                            <i
                                class="
                                    fa-solid
                                    fa-link
                                "
                            ></i>

                            <span data-i18n="415">
                                Services
                            </span>

                        </button>


                        <!-- DELETE -->

                        <button
                            type="button"
                            class="
                                inventory-action-btn
                                danger
                            "
                            onclick="
                                deleteInventoryItem(
                                    ${item.id}
                                )
                            "
                            title="Delete"
                        >

                            <i
                                class="
                                    fa-solid
                                    fa-trash
                                "
                            ></i>

                            <span data-i18n="416">
                                Delete
                            </span>

                        </button>

 <!-- =====================================
     LOW STOCK ALERT
====================================== -->

<div class="inventory-row-alert">

    <div class="inventory-alert-label">

        <i class="fa-solid fa-bell"></i>

        <span data-i18n="417">
            Low Alert
        </span>

    </div>


    <div class="inventory-alert-input-wrap">

        <input
            type="number"
            class="inventory-alert-input"
            id="lowThreshold-${item.id}"
            value="${threshold}"
            min="0"
            step="0.01"
            inputmode="decimal"
            onchange="
                updateLowStockThreshold(
                    ${item.id},
                    this.value
                )
            "
            onkeydown="
                if(event.key === 'Enter'){
                    this.blur();
                }
            "
            title="Set low stock alert threshold"
        >

        <span data-i18n="408">
            units
        </span>

    </div>

</div>
                    </div>

                   

                </div>

            `;

        }).join("");

    /* 🔄 أعد تطبيق الترجمة بعد بناء المخزن */
    applyTranslations();

}
/* =========================================================
   FORMAT OLDER BATCHES COUNT
========================================================= */

function formatOlderBatchesCount(value){

    const number = Number(value || 0);

    if(!Number.isFinite(number)){
        return "0";
    }


    const abs =
        Math.abs(number);


    /* BILLION */

    if(abs >= 1_000_000_000){

        return (
            number / 1_000_000_000
        )
        .toFixed(
            abs >= 10_000_000_000
                ? 0
                : 1
        )
        .replace(
            /\.0$/,
            ""
        )
        + "B";

    }


    /* MILLION */

    if(abs >= 1_000_000){

        return (
            number / 1_000_000
        )
        .toFixed(
            abs >= 10_000_000
                ? 0
                : 1
        )
        .replace(
            /\.0$/,
            ""
        )
        + "M";

    }


    /* THOUSAND */

    if(abs >= 1_000){

        return (
            number / 1_000
        )
        .toFixed(
            abs >= 10_000
                ? 0
                : 1
        )
        .replace(
            /\.0$/,
            ""
        )
        + "K";

    }


    /* NORMAL */

    return number.toLocaleString();

}

async function updateLowStockThreshold(
    itemId,
    value
){

    try{

        /* =========================================
           VALIDATE VALUE
        ========================================= */

        const newThreshold =
            Number(value);


        if(
            !Number.isFinite(newThreshold)
            ||
            newThreshold < 0
        ){

            showToast(
                "Please enter a valid threshold",
                "error"
            );

            return;

        }


        /* =========================================
           FIND ITEM
        ========================================= */

        const item =
            allInventoryItems.find(
                item =>
                    Number(item.id)
                    ===
                    Number(itemId)
            );


        if(!item){

            showToast(
                "Item not found",
                "error"
            );

            return;

        }


        const oldThreshold =
            Number(
                item.low_stock_threshold || 0
            );


        /* =========================================
           NO CHANGE
        ========================================= */

        if(
            newThreshold === oldThreshold
        ){

            return;

        }


        /* =========================================
           USER
        ========================================= */

        const userId =
            await getUserId();


        if(!userId){

            showToast(
                "User not found",
                "error"
            );

            return;

        }


        /* =========================================
           UPDATE DATABASE
        ========================================= */

        const {
            error
        } =
        await supabaseClient

            .from(
                "inventory_items"
            )

            .update({

                low_stock_threshold:
                    newThreshold,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                itemId
            )

            .eq(
                "user_id",
                userId
            );


        if(error){

            console.error(
                "Low stock threshold update error:",
                error
            );


            /* Restore old value */

            const input =
                document.getElementById(
                    `lowThreshold-${itemId}`
                );


            if(input){

                input.value =
                    oldThreshold;

            }


            showToast(
                "Failed to update alert level",
                "error"
            );

            return;

        }


        /* =========================================
           UPDATE LOCAL DATA
        ========================================= */

        item.low_stock_threshold =
            newThreshold;


        /* =========================================
           UPDATE STATISTICS
        ========================================= */

        await updateInventoryStats();


        /* =========================================
           CHECK LOW STOCK
        ========================================= */

        const quantity =
            Number(
                item.quantity || 0
            );


        const isLowStock =
            quantity <= newThreshold;


        /* =========================================
           REFRESH INVENTORY
        ========================================= */

        if(
            typeof renderInventory ===
            "function"
        ){

            renderInventory(
                allInventoryItems
            );

        }


        /* =========================================
           SUCCESS
        ========================================= */

        showToast(

            isLowStock

                ? `Low stock alert: ${newThreshold} units`

                : `Alert threshold set to ${newThreshold} units`,

            "success"

        );

    }
    catch(error){

        console.error(
            "updateLowStockThreshold:",
            error
        );


        showToast(
            "Something went wrong",
            "error"
        );

    }

}
/* =========================================================
   EDIT CURRENT INVENTORY QUANTITY
   IMPORTANT:
   - Does NOT create purchase record
   - Does NOT change purchased_quantity
   - Does NOT change unit_price
   - Does NOT change purchase history
========================================================= */


function openEditInventoryQuantityModal(itemId){

    const item =
        allInventoryItems.find(
            inventoryItem =>
                Number(inventoryItem.id) ===
                Number(itemId)
        );


    if(!item){

        showToast(
            "Inventory item not found"
        );

        return;

    }


    const modal =
        document.getElementById(
            "editInventoryQuantityModal"
        );


    const idInput =
        document.getElementById(
            "editInventoryQuantityItemId"
        );


    const nameElement =
        document.getElementById(
            "editInventoryQuantityItemName"
        );


    const quantityInput =
        document.getElementById(
            "editInventoryQuantityInput"
        );


    if(!modal){

        console.error(
            "Edit quantity modal not found"
        );

        return;

    }


    if(idInput){

        idInput.value =
            item.id;

    }


    if(nameElement){

        nameElement.textContent =
            item.item_name;

    }


    if(quantityInput){

        quantityInput.value =
            Number(
                item.quantity || 0
            );

    }


    modal.style.display =
        "flex";


    setTimeout(() => {

        quantityInput?.focus();

        quantityInput?.select();

    },100);

}



/* =========================================================
   CLOSE EDIT QUANTITY MODAL
========================================================= */

function closeEditInventoryQuantityModal(){

    const modal =
        document.getElementById(
            "editInventoryQuantityModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}



/* =========================================================
   SAVE EDITED CURRENT QUANTITY
========================================================= */

async function saveEditedInventoryQuantity(){

    const userId =
        await getUserId();


    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    const itemId =
        Number(
            document.getElementById(
                "editInventoryQuantityItemId"
            )?.value
        );


    const quantity =
        Number(
            document.getElementById(
                "editInventoryQuantityInput"
            )?.value
        );


    /* =====================================================
       VALIDATION
    ===================================================== */

    if(!itemId){

        showToast(
            "Inventory item not found"
        );

        return;

    }


    if(
        !Number.isFinite(quantity) ||
        quantity < 0
    ){

        showToast(
            "Enter a valid quantity"
        );

        return;

    }


    /* =====================================================
       UPDATE CURRENT QUANTITY ONLY
    ===================================================== */

    const {
        error
    } =
    await supabaseClient

        .from(
            "inventory_items"
        )

        .update({

            quantity:
                quantity

        })

        .eq(
            "id",
            itemId
        )

        .eq(
            "user_id",
            userId
        );


    if(error){

        console.error(
            "Edit inventory quantity error:",
            error
        );

        showToast(
            error.message
        );

        return;

    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    showToast(
        "Current quantity updated"
    );


    closeEditInventoryQuantityModal();


    /* =====================================================
       REFRESH
    ===================================================== */

    await loadInventory();

}

/* =========================================================
   6. STATS
========================================================= */


async function updateInventoryStats(){

    const totalItems =
        document.getElementById(
            "totalItems"
        );


    const totalPurchaseCost =
        document.getElementById(
            "totalPurchaseCost"
        );


    const lowStockCount =
        document.getElementById(
            "lowStockCount"
        );


    /* =====================================================
       TOTAL ITEMS
    ===================================================== */

    if(totalItems){

        totalItems.textContent =
            allInventoryItems.length;

    }


    /* =====================================================
       LOW STOCK
    ===================================================== */

    const lowStockItems =
        allInventoryItems
            .filter(item =>

                Number(
                    item.quantity || 0
                )

                <=

                Number(
                    item.low_stock_threshold || 0
                )

            )
            .sort(
                (a, b) =>

                    Number(
                        a.quantity || 0
                    )

                    -

                    Number(
                        b.quantity || 0
                    )
            );


    const lowCount =
        lowStockItems.length;


    if(lowStockCount){

        lowStockCount.textContent =
            lowCount;

    }


    /* =====================================================
       LOW STOCK HOVER
    ===================================================== */

    const lowStockList =
        document.getElementById(
            "lowStockItemsList"
        );


    if(lowStockList){

        if(!lowStockItems.length){

            lowStockList.innerHTML = `

                <div class="low-stock-empty">

                    <i class="fa-solid fa-circle-check"></i>

                    لا توجد عناصر ناقصة حاليًا

                </div>

            `;

        }

        else{

            lowStockList.innerHTML =

                lowStockItems
                    .slice(0, 8)
                    .map(item => {

                        const quantity =
                            Number(
                                item.quantity || 0
                            );


                        const threshold =
                            Number(
                                item.low_stock_threshold || 0
                            );


                        return `

                            <div class="low-stock-item">

                                <div class="low-stock-item-info">

                                    <strong>
                                        ${escapeHtml(
                                            item.item_name ||
                                            item.name ||
                                            "عنصر بدون اسم"
                                        )}
                                    </strong>

                                    <small>
                                        الحد الأدنى:
                                        ${threshold}
                                    </small>

                                </div>


                                <div
                                    class="low-stock-item-quantity"
                                >

                                    ${quantity}

                                </div>

                            </div>

                        `;

                    })
                    .join("");


            if(lowStockItems.length > 8){

                lowStockList.innerHTML += `

                    <div class="low-stock-more">

                        + ${lowStockItems.length - 8}
                        عناصر أخرى

                    </div>

                `;

            }

        }

    }


    /* =====================================================
       CURRENT MONTH
       PAID PURCHASE INVOICES
    ===================================================== */

    const now =
        new Date();


    const startOfMonth =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const startOfNextMonth =
        new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );


    /* =====================================================
       GET USER
    ===================================================== */

    const userId =
        await getUserId();


    if(!userId){

        if(totalPurchaseCost){

            totalPurchaseCost.textContent =
                "0 EGP";

        }

        return;

    }


    /* =====================================================
       LOAD THIS MONTH INVOICES
       
       IMPORTANT:
       We now calculate using PAID AMOUNT
       from purchase_invoices.
    ===================================================== */

    const {
        data: invoices,
        error
    } =
    await supabaseClient

        .from(
            "purchase_invoices"
        )

        .select(`
            id,
            invoice_date,
            total_amount,
            paid_amount,
            remaining_amount
        `)

        .eq(
            "user_id",
            userId
        )

        .gte(
            "invoice_date",
            startOfMonth
                .toISOString()
                .split("T")[0]
        )

        .lt(
            "invoice_date",
            startOfNextMonth
                .toISOString()
                .split("T")[0]
        );


    /* =====================================================
       ERROR
    ===================================================== */

    if(error){

        console.error(
            "Monthly paid purchase invoices error:",
            error
        );


        if(totalPurchaseCost){

            totalPurchaseCost.textContent =
                "0 EGP";

        }

        return;

    }


    /* =====================================================
       CALCULATE MONTHLY PAID
    ===================================================== */

    const monthlyPaid =
        (invoices || []).reduce(
            (
                sum,
                invoice
            ) => {

                const paid =
                    Number(
                        invoice.paid_amount || 0
                    );


                return (
                    sum
                    +
                    Math.max(
                        paid,
                        0
                    )
                );

            },
            0
        );


    /* =====================================================
       DISPLAY
    ===================================================== */

    if(totalPurchaseCost){

        totalPurchaseCost.textContent =

            `${monthlyPaid.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            )} EGP`;

    }

}



/* =========================================================
   7. ADD ITEM
========================================================= */

async function openAddItemModal(){

    const modal =
        document.getElementById(
            "addItemModal"
        );

    if(!modal) return;


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    await loadPurchaseSuppliers();


    /* =====================================================
       DEFAULT DATE
    ===================================================== */

    const dateInput =
        document.getElementById(
            "purchaseInvoiceDate"
        );


    if(dateInput){

        const today =
            new Date();


        const year =
            today.getFullYear();


        const month =
            String(
                today.getMonth() + 1
            ).padStart(2,"0");


        const day =
            String(
                today.getDate()
            ).padStart(2,"0");


        dateInput.value =
            `${year}-${month}-${day}`;

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    const invoiceNumber =
        document.getElementById(
            "purchaseInvoiceNumber"
        );


    const discountType =
        document.getElementById(
            "purchaseDiscountType"
        );


    const discount =
        document.getElementById(
            "purchaseDiscount"
        );


    const paid =
        document.getElementById(
            "purchasePaidAmount"
        );


    const notes =
        document.getElementById(
            "purchaseInvoiceNotes"
        );


    /* =====================================================
       RESET HEADER
    ===================================================== */

    if(invoiceNumber){

        invoiceNumber.value =
            "";

    }


    /* =====================================================
       DEFAULT DISCOUNT TYPE
       
       amount = EGP
    ===================================================== */

    if(discountType){

        discountType.value =
            "amount";

    }


    /* =====================================================
       RESET DISCOUNT VALUE
       
       Keep input empty so placeholder appears.
    ===================================================== */

    if(discount){

        discount.value =
            "";

    }


    /* =====================================================
       RESET INITIAL PAYMENT
    ===================================================== */

    if(paid){

        paid.value =
            "";

    }


    /* =====================================================
       RESET NOTES
    ===================================================== */

    if(notes){

        notes.value =
            "";

    }


    /* =====================================================
       RESET ITEMS
    ===================================================== */

    const itemsContainer =
        document.getElementById(
            "purchaseInvoiceItems"
        );


    if(itemsContainer){

        itemsContainer.innerHTML =
            "";

    }


    /* =====================================================
       ADD FIRST ITEM
    ===================================================== */

    addPurchaseInvoiceItem();


    /* =====================================================
       CALCULATE TOTALS
    ===================================================== */

    calculatePurchaseInvoiceTotals();


    /* =====================================================
       SHOW MODAL
    ===================================================== */

    modal.style.display =
        "flex";

}
/* =========================================================
   ADD PURCHASE INVOICE ITEM
========================================================= */

function addPurchaseInvoiceItem(){

    const container =
        document.getElementById(
            "purchaseInvoiceItems"
        );

    if(!container) return;


    const row =
        document.createElement("div");


    row.className =
        "purchase-invoice-item";


    row.innerHTML = `

   <!-- =================================================
     ITEM
================================================= -->

<div class="purchase-item-name-wrapper">

    <label>
        Item
    </label>

    <input
        type="text"
        class="purchase-item-name"
        placeholder="e.g. Composite Resin"
        autocomplete="off"
        oninput="handleInventoryItemNameInput(this)"
    >

    <div
        class="inventory-item-suggestions"
    ></div>

</div>

        <!-- =================================================
             QUANTITY
        ================================================== -->

        <div>

            <label>
                Quantity
            </label>

            <input
                type="number"
                class="purchase-item-quantity"
                min="0"
                step="0.001"
                placeholder="Enter quantity"
                oninput="
                    calculatePurchaseInvoiceTotals()
                "
            >

        </div>


        <!-- =================================================
             UNIT PRICE
        ================================================== -->

        <div>

            <label>
                Unit Price
            </label>

            <input
                type="number"
                class="purchase-item-price"
                min="0"
                step="0.01"
                placeholder="Enter unit price"
                oninput="
                    calculatePurchaseInvoiceTotals()
                "
            >

        </div>


        <!-- =================================================
             TOTAL
        ================================================== -->

        <div>

            <label>
                Total
            </label>

            <div
                class="purchase-line-total"
            >

                0 EGP

            </div>

        </div>


        <!-- =================================================
             REMOVE
        ================================================== -->

        <button
            type="button"
            class="purchase-remove-line-btn"
            onclick="
                removePurchaseInvoiceItem(this)
            "
            title="Remove item"
        >

            <i
                class="fa-solid fa-trash"
            ></i>

        </button>

    `;


    container.appendChild(row);


    /* =====================================================
       FOCUS ITEM NAME
    ===================================================== */

    const itemNameInput =
        row.querySelector(
            ".purchase-item-name"
        );


    if(itemNameInput){

        itemNameInput.focus();

    }


    /* =====================================================
       RECALCULATE TOTALS
    ===================================================== */

    calculatePurchaseInvoiceTotals();

}


/* =========================================================
   REMOVE PURCHASE ITEM
========================================================= */

function removePurchaseInvoiceItem(button){

    const row =
        button?.closest(
            ".purchase-invoice-item"
        );


    if(!row) return;


    row.remove();


    /* =====================================================
       RECALCULATE TOTALS
    ===================================================== */

    calculatePurchaseInvoiceTotals();

}
/* =========================================================
   PURCHASE INVOICE TOTALS
========================================================= */

function calculatePurchaseInvoiceTotals(){

    /* =====================================================
       GET ALL ITEMS
    ===================================================== */

    const rows =
        document.querySelectorAll(
            "#purchaseInvoiceItems .purchase-invoice-item"
        );


    let subtotal = 0;


    /* =====================================================
       CALCULATE SUBTOTAL
    ===================================================== */

    rows.forEach(row => {

        const quantity =
            Number(
                row.querySelector(
                    ".purchase-item-quantity"
                )?.value || 0
            );


        const price =
            Number(
                row.querySelector(
                    ".purchase-item-price"
                )?.value || 0
            );


        const total =
            quantity * price;


        subtotal += total;


        /* ================================================
           UPDATE LINE TOTAL
        ================================================ */

        const totalElement =
            row.querySelector(
                ".purchase-line-total"
            );


        if(totalElement){

            totalElement.textContent =
                `${total.toLocaleString(
                    "en-US",
                    {
                        maximumFractionDigits: 2
                    }
                )} EGP`;

        }

    });


    /* =====================================================
       GET DISCOUNT TYPE
    ===================================================== */

    const discountType =
        document.getElementById(
            "purchaseDiscountType"
        )?.value
        || "amount";


    /* =====================================================
       GET DISCOUNT INPUT
    ===================================================== */

    const discountInput =
        Math.max(
            Number(
                document.getElementById(
                    "purchaseDiscount"
                )?.value || 0
            ),
            0
        );


    /* =====================================================
       CALCULATE ACTUAL DISCOUNT
       
       amount  = direct EGP amount
       percent = percentage of subtotal
    ===================================================== */

    let discountAmount = 0;


    if(discountType === "percent"){

        discountAmount =
            subtotal *
            (
                discountInput / 100
            );

    }

    else{

        discountAmount =
            discountInput;

    }


    /* =====================================================
       DISCOUNT CANNOT EXCEED SUBTOTAL
    ===================================================== */

    discountAmount =
        Math.min(
            Math.max(
                discountAmount,
                0
            ),
            subtotal
        );


    /* =====================================================
       CALCULATE TOTAL
    ===================================================== */

    const total =
        Math.max(
            subtotal
            -
            discountAmount,
            0
        );


    /* =====================================================
       GET PAYMENT
    ===================================================== */

    const paid =
        Math.max(
            Number(
                document.getElementById(
                    "purchasePaidAmount"
                )?.value || 0
            ),
            0
        );


    /* =====================================================
       CALCULATE REMAINING
    ===================================================== */

    const remaining =
        Math.max(
            total
            -
            paid,
            0
        );


    /* =====================================================
       UPDATE SUBTOTAL
    ===================================================== */

    const subtotalElement =
        document.getElementById(
            "purchaseSubtotal"
        );


    if(subtotalElement){

        subtotalElement.textContent =
            subtotal.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            );

    }


    /* =====================================================
       UPDATE TOTAL
    ===================================================== */

    const totalElement =
        document.getElementById(
            "purchaseTotal"
        );


    if(totalElement){

        totalElement.textContent =
            total.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            );

    }


    /* =====================================================
       UPDATE REMAINING
    ===================================================== */

    const remainingElement =
        document.getElementById(
            "purchaseRemaining"
        );


    if(remainingElement){

        remainingElement.textContent =
            remaining.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            );

    }


    /* =====================================================
       OPTIONAL DISCOUNT PREVIEW
       
       If you have an element with this ID,
       it will show the real EGP discount.
    ===================================================== */

    const discountPreview =
        document.getElementById(
            "purchaseDiscountPreview"
        );


    if(discountPreview){

        discountPreview.textContent =
            discountAmount.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            )
            +
            " EGP";

    }


    /* =====================================================
       RETURN VALUES
       
       Useful for savePurchaseInvoice()
    ===================================================== */

    return {

        subtotal,

        discountInput,

        discountType,

        discountAmount,

        total,

        paid,

        remaining

    };

}


async function savePurchaseInvoice(){

    const userId =
        await getUserId();


    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    /* =====================================================
       GET HEADER
    ===================================================== */

    const supplierId =
        Number(
            document.getElementById(
                "purchaseSupplier"
            )?.value
        );


    const invoiceNumber =
        document.getElementById(
            "purchaseInvoiceNumber"
        )?.value
        ?.trim()
        || "";


    const invoiceDate =
        document.getElementById(
            "purchaseInvoiceDate"
        )?.value
        || "";


    /* =====================================================
       DISCOUNT TYPE
       
       amount  = EGP
       percent = %
    ===================================================== */

    const discountType =
        document.getElementById(
            "purchaseDiscountType"
        )?.value
        || "amount";


    /* =====================================================
       DISCOUNT INPUT
       
       This is the value entered by the user.
    ===================================================== */

    const discountInput =
        Math.max(
            Number(
                document.getElementById(
                    "purchaseDiscount"
                )?.value || 0
            ),
            0
        );


    /*
       IMPORTANT:

       purchasePaidAmount means:

       "NEW PAYMENT"

       NOT total paid amount.
    */

    const newPayment =
        Math.max(
            Number(
                document.getElementById(
                    "purchasePaidAmount"
                )?.value || 0
            ),
            0
        );


    const notes =
        document.getElementById(
            "purchaseInvoiceNotes"
        )?.value
        ?.trim()
        || "";


    /* =====================================================
       VALIDATE HEADER
    ===================================================== */

    if(!supplierId){

        showToast(
            "Please select a supplier"
        );

        return;

    }


    if(!invoiceDate){

        showToast(
            "Please select invoice date"
        );

        return;

    }


    if(
        !Number.isFinite(
            discountInput
        )
        ||
        discountInput < 0
    ){

        showToast(
            "Enter a valid discount"
        );

        return;

    }


    /* =====================================================
       VALIDATE PERCENTAGE
    ===================================================== */

    if(
        discountType === "percent"
        &&
        discountInput > 100
    ){

        showToast(
            "Discount percentage cannot exceed 100%"
        );

        return;

    }


    if(
        !Number.isFinite(
            newPayment
        )
        ||
        newPayment < 0
    ){

        showToast(
            "Enter a valid payment amount"
        );

        return;

    }


    /* =====================================================
       COLLECT ITEMS
    ===================================================== */

    const rows =
        document.querySelectorAll(
            "#purchaseInvoiceItems .purchase-invoice-item"
        );


    const items = [];


    rows.forEach(row => {

        const itemName =
            row.querySelector(
                ".purchase-item-name"
            )?.value
            ?.trim()
            || "";


        const quantity =
            Number(
                row.querySelector(
                    ".purchase-item-quantity"
                )?.value || 0
            );


        const unitPrice =
            Number(
                row.querySelector(
                    ".purchase-item-price"
                )?.value || 0
            );


        items.push({

            item_name:
                itemName,

            quantity:
                quantity,

            unit_price:
                unitPrice

        });

    });


    /* =====================================================
       REMOVE COMPLETELY EMPTY ROWS
    ===================================================== */

    const validItems =
        items.filter(
            item =>
                item.item_name
                ||
                item.quantity
                ||
                item.unit_price
        );


    /*
       Existing invoice may be updated
       without adding new items.
    */

    const hasNewItems =
        validItems.length > 0;


    /* =====================================================
       VALIDATE ITEMS
    ===================================================== */

    if(hasNewItems){

        for(
            const item
            of validItems
        ){

            if(!item.item_name){

                showToast(
                    "Enter item name for every row"
                );

                return;

            }


            if(
                !Number.isFinite(
                    item.quantity
                )
                ||
                item.quantity <= 0
            ){

                showToast(
                    `Invalid quantity for ${item.item_name}`
                );

                return;

            }


            if(
                !Number.isFinite(
                    item.unit_price
                )
                ||
                item.unit_price < 0
            ){

                showToast(
                    `Invalid price for ${item.item_name}`
                );

                return;

            }

        }

    }


    /* =====================================================
       SAVE BUTTON
    ===================================================== */

    const saveButton =
        document.querySelector(
            "#addItemModal .storage-save-btn"
        );


    if(saveButton){

        saveButton.disabled =
            true;


        saveButton.innerHTML = `

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Saving...

        `;

    }


    try{

        /* =================================================
           1. VERIFY SUPPLIER
        ================================================= */

        const {
            data: supplier,
            error: supplierError
        } =
        await supabaseClient

            .from(
                "suppliers"
            )

            .select(`
                id,
                supplier_name
            `)

            .eq(
                "id",
                supplierId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(supplierError){

            throw supplierError;

        }


        if(!supplier){

            throw new Error(
                "Supplier not found"
            );

        }


        /* =================================================
           2. FIND EXISTING INVOICE
           
           Merge only when invoice number exists.
        ================================================= */

        let existingInvoice =
            null;


        if(invoiceNumber){

            const {
                data: invoiceData,
                error: invoiceSearchError
            } =
            await supabaseClient

                .from(
                    "purchase_invoices"
                )

                .select(`
                    id,
                    supplier_id,
                    invoice_number,
                    invoice_date,
                    subtotal,
                    discount,
                    total_amount,
                    paid_amount,
                    remaining_amount,
                    notes
                `)

                .eq(
                    "user_id",
                    userId
                )

                .eq(
                    "supplier_id",
                    supplierId
                )

                .eq(
                    "invoice_number",
                    invoiceNumber
                )

                .maybeSingle();


            if(invoiceSearchError){

                throw invoiceSearchError;

            }


            existingInvoice =
                invoiceData || null;

        }


        /* =================================================
           3. DETERMINE INVOICE
        ================================================= */

        let invoiceId;


        if(existingInvoice){

            invoiceId =
                existingInvoice.id;


            console.log(
                "Existing invoice found:",
                invoiceId
            );

        }


        /* =================================================
           4. CREATE NEW INVOICE
        ================================================= */

        else{

            if(!hasNewItems){

                showToast(
                    "Add at least one item"
                );

                return;

            }


            const initialSubtotal =
                validItems.reduce(
                    (
                        sum,
                        item
                    ) => {

                        return (
                            sum
                            +
                            (
                                item.quantity
                                *
                                item.unit_price
                            )
                        );

                    },
                    0
                );


            /* =============================================
               CALCULATE INITIAL DISCOUNT
            ============================================= */

            let initialDiscount = 0;


            if(
                discountType === "percent"
            ){

                initialDiscount =
                    initialSubtotal
                    *
                    (
                        discountInput
                        /
                        100
                    );

            }

            else{

                initialDiscount =
                    discountInput;

            }


            initialDiscount =
                Math.min(
                    Math.max(
                        initialDiscount,
                        0
                    ),
                    initialSubtotal
                );


            const initialTotal =
                Math.max(
                    initialSubtotal
                    -
                    initialDiscount,
                    0
                );


            if(newPayment > initialTotal){

                showToast(
                    "Payment cannot exceed invoice total"
                );

                return;

            }


            /* =============================================
               CREATE INVOICE
            ============================================= */

            const {
                data: newInvoice,
                error: invoiceInsertError
            } =
            await supabaseClient

                .from(
                    "purchase_invoices"
                )

                .insert({

                    user_id:
                        userId,

                    supplier_id:
                        supplierId,

                    invoice_number:
                        invoiceNumber
                        ||
                        null,

                    invoice_date:
                        invoiceDate,

                    subtotal:
                        initialSubtotal,

                    /*
                       IMPORTANT:

                       Database stores the actual
                       EGP discount amount.
                    */

                    discount:
                        initialDiscount,

                    total_amount:
                        initialTotal,

                    paid_amount:
                        0,

                    remaining_amount:
                        initialTotal,

                    notes:
                        notes
                        ||
                        null

                })

                .select(`
                    id
                `)

                .single();


            if(invoiceInsertError){

                throw invoiceInsertError;

            }


            invoiceId =
                newInvoice.id;


            console.log(
                "New purchase invoice created:",
                invoiceId
            );

        }


        /* =================================================
           5. LOAD EXISTING INVENTORY
        ================================================= */

        const {
            data: existingInventory,
            error: inventoryLoadError
        } =
        await supabaseClient

            .from(
                "inventory_items"
            )

            .select(`
                id,
                item_name,
                quantity,
                purchased_quantity,
                unit_price,
                low_stock_threshold
            `)

            .eq(
                "user_id",
                userId
            );


        if(inventoryLoadError){

            throw inventoryLoadError;

        }


        /* =================================================
           6. PROCESS NEW PURCHASE ITEMS
        ================================================= */

        for(
            const purchaseItem
            of validItems
        ){

            const normalizedName =
                purchaseItem.item_name
                    .trim()
                    .toLowerCase();


            const existingItem =
                (existingInventory || [])
                    .find(
                        item => {

                            const existingName =
                                String(
                                    item.item_name
                                    ||
                                    ""
                                )
                                .trim()
                                .toLowerCase();


                            return (
                                existingName
                                ===
                                normalizedName
                            );

                        }
                    );


            /* =============================================
               EXISTING INVENTORY ITEM
            ============================================= */

            if(existingItem){

                const currentQuantity =
                    Number(
                        existingItem.quantity
                        ||
                        0
                    );


                const currentPurchasedQuantity =
                    Number(
                        existingItem.purchased_quantity
                        ||
                        0
                    );


                const currentUnitPrice =
                    Number(
                        existingItem.unit_price
                        ||
                        0
                    );


                const newQuantity =
                    currentQuantity
                    +
                    purchaseItem.quantity;


                const newPurchasedQuantity =
                    currentPurchasedQuantity
                    +
                    purchaseItem.quantity;


                /* =========================================
                   WEIGHTED AVERAGE COST
                ========================================= */

                const oldPurchaseCost =
                    currentPurchasedQuantity
                    *
                    currentUnitPrice;


                const newPurchaseCost =
                    purchaseItem.quantity
                    *
                    purchaseItem.unit_price;


                const totalPurchaseCost =
                    oldPurchaseCost
                    +
                    newPurchaseCost;


                const newAverageUnitPrice =
                    newPurchasedQuantity > 0
                    ?
                    (
                        totalPurchaseCost
                        /
                        newPurchasedQuantity
                    )
                    :
                    0;


                /* =========================================
                   UPDATE INVENTORY
                ========================================= */

                const {
                    error: updateError
                } =
                await supabaseClient

                    .from(
                        "inventory_items"
                    )

                    .update({

                        quantity:
                            newQuantity,

                        purchased_quantity:
                            newPurchasedQuantity,

                        unit_price:
                            Number(
                                newAverageUnitPrice
                                    .toFixed(4)
                            ),

                        updated_at:
                            new Date()
                                .toISOString()

                    })

                    .eq(
                        "id",
                        existingItem.id
                    )

                    .eq(
                        "user_id",
                        userId
                    );


                if(updateError){

                    throw updateError;

                }


                /* =========================================
                   PURCHASE HISTORY
                ========================================= */

                const {
                    error: purchaseError
                } =
                await supabaseClient

                    .from(
                        "inventory_purchases"
                    )

                    .insert({

                        user_id:
                            userId,

                        inventory_item_id:
                            existingItem.id,

                        purchased_quantity:
                            purchaseItem.quantity,

                        unit_price:
                            purchaseItem.unit_price,

                        purchase_invoice_id:
                            invoiceId

                    });


                if(purchaseError){

                    throw purchaseError;

                }

            }


            /* =============================================
               NEW INVENTORY ITEM
            ============================================= */

            else{

                const {
                    data: newItem,
                    error: insertError
                } =
                await supabaseClient

                    .from(
                        "inventory_items"
                    )

                    .insert({

                        user_id:
                            userId,

                        item_name:
                            purchaseItem.item_name,

                        quantity:
                            purchaseItem.quantity,

                        purchased_quantity:
                            purchaseItem.quantity,

                        unit_price:
                            purchaseItem.unit_price,

                        low_stock_threshold:
                            1

                    })

                    .select(`
                        id
                    `)

                    .single();


                if(insertError){

                    throw insertError;

                }


                /* =========================================
                   FIRST PURCHASE HISTORY
                ========================================= */

                const {
                    error: purchaseError
                } =
                await supabaseClient

                    .from(
                        "inventory_purchases"
                    )

                    .insert({

                        user_id:
                            userId,

                        inventory_item_id:
                            newItem.id,

                        purchased_quantity:
                            purchaseItem.quantity,

                        unit_price:
                            purchaseItem.unit_price,

                        purchase_invoice_id:
                            invoiceId

                    });


                if(purchaseError){

                    throw purchaseError;

                }

            }

        }


        /* =================================================
           7. LOAD ALL PURCHASES FOR THIS INVOICE
           
           REAL SUBTOTAL
        ================================================= */

        const {
            data: invoicePurchases,
            error: invoicePurchasesError
        } =
        await supabaseClient

            .from(
                "inventory_purchases"
            )

            .select(`
                id,
                purchased_quantity,
                unit_price,
                total_purchase_price
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            );


        if(invoicePurchasesError){

            throw invoicePurchasesError;

        }


        const invoiceSubtotal =
            (invoicePurchases || [])
                .reduce(
                    (
                        sum,
                        purchase
                    ) => {

                        return (
                            sum
                            +
                            Number(
                                purchase.total_purchase_price
                                ||
                                (
                                    Number(
                                        purchase.purchased_quantity
                                        ||
                                        0
                                    )
                                    *
                                    Number(
                                        purchase.unit_price
                                        ||
                                        0
                                    )
                                )
                            )
                        );

                    },
                    0
                );


        /* =================================================
           8. CALCULATE FINAL DISCOUNT
           
           IMPORTANT:

           The user input can be:

           amount:
           1000 EGP

           percent:
           10%

           But database stores only the actual
           monetary discount.
        ================================================= */

        let finalDiscount = 0;


        if(
            discountType === "percent"
        ){

            if(
                discountInput > 100
            ){

                showToast(
                    "Discount percentage cannot exceed 100%"
                );

                return;

            }


            finalDiscount =
                invoiceSubtotal
                *
                (
                    discountInput
                    /
                    100
                );

        }

        else{

            finalDiscount =
                discountInput;

        }


        /* =================================================
           PROTECT DISCOUNT
        ================================================= */

        if(
            !Number.isFinite(
                finalDiscount
            )
            ||
            finalDiscount < 0
        ){

            finalDiscount =
                0;

        }


        if(
            finalDiscount
            >
            invoiceSubtotal
        ){

            showToast(
                "Discount cannot exceed subtotal"
            );

            return;

        }


        /* =================================================
           ROUND DISCOUNT
        ================================================= */

        finalDiscount =
            Number(
                finalDiscount.toFixed(2)
            );


        /* =================================================
           9. CALCULATE FINAL TOTAL
        ================================================= */

        const finalTotal =
            Math.max(
                invoiceSubtotal
                -
                finalDiscount,
                0
            );


        /* =================================================
           10. LOAD ALL PREVIOUS PAYMENTS
        ================================================= */

        const {
            data: previousPayments,
            error: paymentsLoadError
        } =
        await supabaseClient

            .from(
                "purchase_invoice_payments"
            )

            .select(`
                id,
                amount,
                payment_date,
                notes
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            )

            .order(
                "payment_date",
                {
                    ascending:
                        true
                }
            );


        if(paymentsLoadError){

            throw paymentsLoadError;

        }


        const previousPaidAmount =
            (previousPayments || [])
                .reduce(
                    (
                        sum,
                        payment
                    ) => {

                        return (
                            sum
                            +
                            Number(
                                payment.amount
                                ||
                                0
                            )
                        );

                    },
                    0
                );


        /* =================================================
           11. CHECK EXISTING PAYMENTS
        ================================================= */

        if(
            previousPaidAmount
            >
            finalTotal
        ){

            showToast(
                "The new discount makes the invoice total lower than the amount already paid"
            );

            return;

        }


        /* =================================================
           12. CHECK NEW PAYMENT
        ================================================= */

        const remainingBeforeNewPayment =
            Math.max(
                finalTotal
                -
                previousPaidAmount,
                0
            );


        if(
            newPayment
            >
            remainingBeforeNewPayment
        ){

            showToast(
                `New payment cannot exceed remaining amount (${remainingBeforeNewPayment.toFixed(2)} EGP)`
            );

            return;

        }


        /* =================================================
           13. INSERT NEW PAYMENT
        ================================================= */

        if(newPayment > 0){

            const {
                error: paymentInsertError
            } =
            await supabaseClient

                .from(
                    "purchase_invoice_payments"
                )

                .insert({

                    user_id:
                        userId,

                    purchase_invoice_id:
                        invoiceId,

                    amount:
                        newPayment,

                    payment_date:
                        invoiceDate,

                    notes:
                        notes
                        ||
                        null

                });


            if(paymentInsertError){

                throw paymentInsertError;

            }


            console.log(
                "New payment added:",
                newPayment
            );

        }


        /* =================================================
           14. FINAL PAYMENT TOTAL
        ================================================= */

        const finalPaid =
            previousPaidAmount
            +
            newPayment;


        const finalRemaining =
            Math.max(
                finalTotal
                -
                finalPaid,
                0
            );


        /* =================================================
           15. FINAL NOTES
        ================================================= */

        let finalNotes =
            notes
            ||
            null;


        if(
            existingInvoice
            &&
            !notes
        ){

            finalNotes =
                existingInvoice.notes
                ||
                null;

        }


        /* =================================================
           16. UPDATE INVOICE
        ================================================= */

        const {
            error: invoiceUpdateError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .update({

                invoice_date:
                    invoiceDate,

                subtotal:
                    Number(
                        invoiceSubtotal.toFixed(2)
                    ),

                /*
                   Database stores ACTUAL EGP
                   discount amount.
                */

                discount:
                    finalDiscount,

                total_amount:
                    Number(
                        finalTotal.toFixed(2)
                    ),

                paid_amount:
                    Number(
                        finalPaid.toFixed(2)
                    ),

                remaining_amount:
                    Number(
                        finalRemaining.toFixed(2)
                    ),

                notes:
                    finalNotes,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(invoiceUpdateError){

            throw invoiceUpdateError;

        }


        /* =================================================
           17. SUCCESS LOG
        ================================================= */

        console.log(
            "========================================"
        );

        console.log(
            "PURCHASE INVOICE SAVED"
        );

        console.log(
            "========================================"
        );

        console.log({

            invoiceId,

            supplierId,

            supplierName:
                supplier.supplier_name,

            invoiceNumber:
                invoiceNumber
                ||
                "(No Number)",

            subtotal:
                invoiceSubtotal,

            discountType:
                discountType,

            discountInput:
                discountInput,

            discountAmount:
                finalDiscount,

            total:
                finalTotal,

            previousPaid:
                previousPaidAmount,

            newPayment:
                newPayment,

            totalPaid:
                finalPaid,

            remaining:
                finalRemaining,

            newItems:
                validItems

        });


        /* =================================================
           18. SUCCESS MESSAGE
        ================================================= */

        if(existingInvoice){

            if(newPayment > 0){

                showToast(
                    "Invoice updated and payment added successfully"
                );

            }

            else if(hasNewItems){

                showToast(
                    "Items added to existing invoice successfully"
                );

            }

            else{

                showToast(
                    "Invoice updated successfully"
                );

            }

        }

        else{

            showToast(
                "Purchase invoice saved successfully"
            );

        }


        /* =================================================
           19. CLOSE MODAL
        ================================================= */

        closeAddItemModal();


        /* =================================================
           20. REFRESH INVENTORY
        ================================================= */

        await loadInventory();


        /* =================================================
           21. REFRESH AUTOCOMPLETE
        ================================================= */

        await loadInventoryItemNames();


        /*
           If available:

           await loadPurchaseInvoices();
        */

    }


    catch(error){

        console.error(
            "Purchase invoice error:",
            error
        );


        showToast(
            error?.message
            ||
            "Failed to save purchase invoice"
        );

    }


    finally{

        if(saveButton){

            saveButton.disabled =
                false;


            saveButton.innerHTML = `

                <i
                    class="
                        fa-solid
                        fa-file-circle-check
                    "
                ></i>

                Save Invoice

            `;

        }

    }

}
/* =========================================================
   PURCHASE INVOICES / RECORDS
========================================================= */

function openPurchaseInvoicesModal(){

    const modal =
        document.getElementById(
            "purchaseInvoicesModal"
        );

    if(!modal){
        console.error(
            "purchaseInvoicesModal not found"
        );
        return;
    }


    modal.style.display = "flex";


    /* Load invoices */

    if(
        typeof loadPurchaseInvoices === "function"
    ){

        loadPurchaseInvoices();

    }


    /* Load suppliers for filter */

    if(
        typeof loadPurchaseInvoiceSupplierFilter === "function"
    ){

        loadPurchaseInvoiceSupplierFilter();

    }


    /* Prevent background scroll */

    document.body.classList.add(
        "modal-open"
    );

}



/* =========================================================
   CLOSE PURCHASE INVOICES
========================================================= */

function closePurchaseInvoicesModal(){

    const modal =
        document.getElementById(
            "purchaseInvoicesModal"
        );

    if(!modal) return;


    modal.style.display = "none";


    document.body.classList.remove(
        "modal-open"
    );

}



/* =========================================================
   PURCHASE INVOICE DETAILS
========================================================= */

function openPurchaseInvoiceDetails(
    invoiceId
){

    if(!invoiceId){

        console.error(
            "Invoice ID is required"
        );

        return;

    }


    const modal =
        document.getElementById(
            "purchaseInvoiceDetailsModal"
        );

    if(!modal){

        console.error(
            "purchaseInvoiceDetailsModal not found"
        );

        return;

    }


    /* Store current invoice */

    window.currentPurchaseInvoiceId =
        Number(invoiceId);


    modal.style.display = "flex";


    document.body.classList.add(
        "modal-open"
    );


    /* Reset content */

    const items =
        document.getElementById(
            "purchaseInvoiceDetailsItems"
        );

    if(items){

        items.innerHTML = `

            <div class="storage-loading">

                <i
                    class="
                        fa-solid
                        fa-spinner
                        fa-spin
                    "
                ></i>

                Loading invoice items...

            </div>

        `;

    }


    const payments =
        document.getElementById(
            "purchaseInvoicePaymentsList"
        );

    if(payments){

        payments.innerHTML = `

            <div class="storage-loading">

                <i
                    class="
                        fa-solid
                        fa-spinner
                        fa-spin
                    "
                ></i>

                Loading payment history...

            </div>

        `;

    }


    /* Load details */

    if(
        typeof loadPurchaseInvoiceDetails ===
        "function"
    ){

        loadPurchaseInvoiceDetails(
            Number(invoiceId)
        );

    }
    else{

        console.warn(
            "loadPurchaseInvoiceDetails() is not defined yet"
        );

    }

}



/* =========================================================
   CLOSE PURCHASE INVOICE DETAILS
========================================================= */

function closePurchaseInvoiceDetails(){

    const modal =
        document.getElementById(
            "purchaseInvoiceDetailsModal"
        );

    if(!modal) return;


    modal.style.display = "none";


    window.currentPurchaseInvoiceId =
        null;


    document.body.classList.remove(
        "modal-open"
    );

}



/* =========================================================
   ADD PURCHASE PAYMENT
========================================================= */

function openAddPurchasePayment(
    invoiceId = null
){

    /*
       If no ID was passed, use the invoice
       currently opened in the details modal.
    */

    if(!invoiceId){

        invoiceId =
            window.currentPurchaseInvoiceId;

    }


    if(!invoiceId){

        showToast(
            "Please open an invoice first"
        );

        return;

    }


    invoiceId =
        Number(invoiceId);


    const modal =
        document.getElementById(
            "purchasePaymentModal"
        );

    if(!modal){

        console.error(
            "purchasePaymentModal not found"
        );

        return;

    }


    /* Hidden invoice ID */

    const invoiceIdInput =
        document.getElementById(
            "purchasePaymentInvoiceId"
        );

    if(invoiceIdInput){

        invoiceIdInput.value =
            invoiceId;

    }


    /* Reset form */

    const amountInput =
        document.getElementById(
            "purchasePaymentAmount"
        );

    if(amountInput){

        amountInput.value = "";

    }


    const notesInput =
        document.getElementById(
            "purchasePaymentNotes"
        );

    if(notesInput){

        notesInput.value = "";

    }


    /* Default payment date */

    const dateInput =
        document.getElementById(
            "purchasePaymentDate"
        );

    if(dateInput){

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        dateInput.value =
            today;

    }


    /* Load invoice preview */

    if(
        typeof loadPurchasePaymentInvoicePreview ===
        "function"
    ){

        loadPurchasePaymentInvoicePreview(
            invoiceId
        );

    }


    modal.style.display = "flex";


    document.body.classList.add(
        "modal-open"
    );


    /* Focus amount */

    setTimeout(() => {

        amountInput?.focus();

    }, 100);

}



/* =========================================================
   CLOSE ADD PAYMENT
========================================================= */

function closePurchasePaymentModal(){

    const modal =
        document.getElementById(
            "purchasePaymentModal"
        );

    if(!modal) return;


    modal.style.display = "none";


    document.body.classList.remove(
        "modal-open"
    );


    const invoiceIdInput =
        document.getElementById(
            "purchasePaymentInvoiceId"
        );

    if(invoiceIdInput){

        invoiceIdInput.value = "";

    }

}



/* =========================================================
   EDIT PURCHASE DISCOUNT
========================================================= */

function openEditPurchaseDiscount(
    invoiceId = null
){

    /*
       If no invoice ID was supplied,
       use the currently opened invoice.
    */

    if(!invoiceId){

        invoiceId =
            window.currentPurchaseInvoiceId;

    }


    if(!invoiceId){

        showToast(
            "Please open an invoice first"
        );

        return;

    }


    invoiceId =
        Number(invoiceId);


    const modal =
        document.getElementById(
            "purchaseDiscountModal"
        );

    if(!modal){

        console.error(
            "purchaseDiscountModal not found"
        );

        return;

    }


    /* Hidden invoice ID */

    const invoiceIdInput =
        document.getElementById(
            "purchaseDiscountInvoiceId"
        );

    if(invoiceIdInput){

        invoiceIdInput.value =
            invoiceId;

    }


    /* Reset */

    const discountInput =
        document.getElementById(
            "purchaseEditDiscount"
        );

    if(discountInput){

        discountInput.value = "";

    }


    /* Load current invoice data */

    if(
        typeof loadPurchaseDiscountData ===
        "function"
    ){

        loadPurchaseDiscountData(
            invoiceId
        );

    }


    modal.style.display = "flex";


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(() => {

        discountInput?.focus();

    }, 100);

}



/* =========================================================
   CLOSE EDIT DISCOUNT
========================================================= */

function closePurchaseDiscountModal(){

    const modal =
        document.getElementById(
            "purchaseDiscountModal"
        );

    if(!modal) return;


    modal.style.display = "none";


    document.body.classList.remove(
        "modal-open"
    );


    const invoiceIdInput =
        document.getElementById(
            "purchaseDiscountInvoiceId"
        );

    if(invoiceIdInput){

        invoiceIdInput.value = "";

    }

}



/* =========================================================
   CLOSE ALL PURCHASE MODALS
========================================================= */

function closeAllPurchaseModals(){

    const modalIds = [

        "purchaseInvoicesModal",

        "purchaseInvoiceDetailsModal",

        "purchasePaymentModal",

        "purchaseDiscountModal"

    ];


    modalIds.forEach(id => {

        const modal =
            document.getElementById(id);

        if(modal){

            modal.style.display =
                "none";

        }

    });


    window.currentPurchaseInvoiceId =
        null;


    document.body.classList.remove(
        "modal-open"
    );

}



/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if(event.key !== "Escape"){
            return;
        }


        const paymentModal =
            document.getElementById(
                "purchasePaymentModal"
            );

        const discountModal =
            document.getElementById(
                "purchaseDiscountModal"
            );

        const detailsModal =
            document.getElementById(
                "purchaseInvoiceDetailsModal"
            );

        const recordsModal =
            document.getElementById(
                "purchaseInvoicesModal"
            );


        /*
           Close child modal first.
        */

        if(
            paymentModal &&
            paymentModal.style.display === "flex"
        ){

            closePurchasePaymentModal();

            return;

        }


        if(
            discountModal &&
            discountModal.style.display === "flex"
        ){

            closePurchaseDiscountModal();

            return;

        }


        if(
            detailsModal &&
            detailsModal.style.display === "flex"
        ){

            closePurchaseInvoiceDetails();

            return;

        }


        if(
            recordsModal &&
            recordsModal.style.display === "flex"
        ){

            closePurchaseInvoicesModal();

        }

    }
);

/* =========================================================
   PURCHASE INVOICES
   RECORDS / DETAILS / PAYMENTS / DISCOUNT
========================================================= */


/* =========================================================
   GLOBAL CURRENT INVOICE
========================================================= */

window.currentPurchaseInvoiceId =
    window.currentPurchaseInvoiceId || null;

window.purchaseInvoicesCache =
    [];



/* =========================================================
   FORMAT MONEY
========================================================= */

function formatPurchaseMoney(value){

    const number =
        Number(value || 0);

    return number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

}



/* =========================================================
   GET TODAY
========================================================= */

function getPurchaseToday(){

    return new Date()
        .toISOString()
        .split("T")[0];

}



/* =========================================================
   LOAD PURCHASE INVOICE SUPPLIER FILTER
========================================================= */

async function loadPurchaseInvoiceSupplierFilter(){

    const select =
        document.getElementById(
            "purchaseInvoiceSupplierFilter"
        );

    if(!select){
        return;
    }


    const userId =
        await getUserId();

    if(!userId){
        return;
    }


    try{

        const {
            data,
            error
        } =
        await supabaseClient

            .from("suppliers")

            .select(`
                id,
                supplier_name
            `)

            .eq(
                "user_id",
                userId
            )

            .order(
                "supplier_name",
                {
                    ascending: true
                }
            );


        if(error){
            throw error;
        }


        select.innerHTML = `

            <option value="">
                All Suppliers
            </option>

        `;


        (data || []).forEach(
            supplier => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    supplier.id;


                option.textContent =
                    supplier.supplier_name;


                select.appendChild(
                    option
                );

            }
        );


    }
    catch(error){

        console.error(
            "Supplier filter error:",
            error
        );

    }

}



/* =========================================================
   LOAD PURCHASE INVOICES
========================================================= */

async function loadPurchaseInvoices(){

    const container =
        document.getElementById(
            "purchaseInvoicesList"
        );


    if(!container){
        return;
    }


    const userId =
        await getUserId();


    if(!userId){

        container.innerHTML = `

            <div class="storage-empty">
                User not found
            </div>

        `;

        return;

    }


    container.innerHTML = `

        <div class="storage-loading">

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Loading purchase invoices...

        </div>

    `;


    try{

        const {
            data: invoices,
            error
        } =
        await supabaseClient

            .from("purchase_invoices")

            .select(`
                id,
                user_id,
                supplier_id,
                invoice_number,
                invoice_date,
                subtotal,
                discount,
                total_amount,
                paid_amount,
                remaining_amount,
                notes,
                created_at,
                updated_at,
                suppliers (
                    supplier_name
                )
            `)

            .eq(
                "user_id",
                userId
            )

            .order(
                "invoice_date",
                {
                    ascending: false
                }
            )

            .order(
                "id",
                {
                    ascending: false
                });


        if(error){
            throw error;
        }


        window.purchaseInvoicesCache =
            invoices || [];


        renderPurchaseInvoices(
            window.purchaseInvoicesCache
        );


    }
    catch(error){

        console.error(
            "Load purchase invoices error:",
            error
        );


        container.innerHTML = `

            <div class="storage-empty">

                <i
                    class="
                        fa-solid
                        fa-circle-exclamation
                    "
                ></i>

                Failed to load purchase invoices

            </div>

        `;

        showToast(
            error?.message ||
            "Failed to load purchase invoices"
        );

    }

}



/* =========================================================
   RENDER PURCHASE INVOICES
========================================================= */

/* =========================================================
   RENDER PURCHASE INVOICES BY MONTH
========================================================= */

/* =====================================================
   RENDER PURCHASE INVOICES
===================================================== */

function renderPurchaseInvoices(invoices){

    const container =
        document.getElementById(
            "purchaseInvoicesList"
        );


    if(!container){
        return;
    }


    /* =====================================================
       NO INVOICES
    ===================================================== */

    if(!invoices || !invoices.length){

        container.innerHTML = `

            <div class="storage-empty">

                <i
                    class="
                        fa-solid
                        fa-file-invoice
                    "
                ></i>

                <strong>
                    No purchase invoices
                </strong>

                <span>
                    Purchase invoices will appear here.
                </span>

            </div>

        `;

        updatePurchaseRecordsSummary([]);

        return;
    }


    /* =====================================================
       UPDATE GLOBAL SUMMARY
    ===================================================== */

    updatePurchaseRecordsSummary(
        invoices
    );


    /* =====================================================
       GROUP INVOICES BY MONTH
    ===================================================== */

    const groupedByMonth = {};


    invoices.forEach(invoice => {

        const date =
            invoice.invoice_date
                ? new Date(
                    invoice.invoice_date +
                    "T00:00:00"
                )
                : null;


        let monthKey;
        let monthLabel;


        /* =================================================
           GET MONTH
        ================================================= */

        if(
            date &&
            !isNaN(date)
        ){

            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            monthKey =
                `${year}-${month}`;


            monthLabel =
                date.toLocaleDateString(
                    "en-US",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );

        }

        else{

            monthKey =
                "unknown";

            monthLabel =
                "Unknown Date";

        }


        /* =================================================
           CREATE MONTH GROUP
        ================================================= */

        if(
            !groupedByMonth[monthKey]
        ){

            groupedByMonth[monthKey] = {

                label:
                    monthLabel,

                invoices:
                    [],

                total:
                    0,

                paid:
                    0,

                remaining:
                    0,

                suppliers:
                    new Set()

            };

        }


        /* =================================================
           ADD INVOICE
        ================================================= */

        groupedByMonth[monthKey]
            .invoices
            .push(
                invoice
            );


        /* =================================================
           MONTH TOTAL
        ================================================= */

        groupedByMonth[monthKey]
            .total += Number(
                invoice.total_amount || 0
            );


        /* =================================================
           MONTH PAID
        ================================================= */

        groupedByMonth[monthKey]
            .paid += Number(
                invoice.paid_amount || 0
            );


        /* =================================================
           MONTH REMAINING
        ================================================= */

        groupedByMonth[monthKey]
            .remaining += Number(
                invoice.remaining_amount || 0
            );


        /* =================================================
           SUPPLIERS
        ================================================= */

        if(
            invoice.supplier_id
        ){

            groupedByMonth[monthKey]
                .suppliers
                .add(
                    invoice.supplier_id
                );

        }

    });


    /* =====================================================
       SORT MONTHS
       newest -> oldest
    ===================================================== */

    const months =
        Object.keys(
            groupedByMonth
        ).sort(
            (a,b) =>
                b.localeCompare(a)
        );


    /* =====================================================
       RENDER MONTHS
    ===================================================== */

    container.innerHTML =

        months.map(
            (monthKey, index) => {

                const month =
                    groupedByMonth[
                        monthKey
                    ];


                /* =========================================
                   MONTH STATISTICS
                ========================================= */

                const invoiceCount =
                    month.invoices.length;


                const supplierCount =
                    month.suppliers.size;


                const monthTotal =
                    month.total;


                const monthPaid =
                    month.paid;


                const monthRemaining =
                    month.remaining;


                /* =========================================
                   FIRST MONTH OPEN
                ========================================= */

                const openAttr =
                    index === 0
                        ? "open"
                        : "";


                /* =========================================
                   RENDER INVOICES INSIDE MONTH
                ========================================= */

                const invoicesHTML =

                    month.invoices.map(
                        invoice => {


                            /* =============================
                               SUPPLIER
                            ============================= */

                            const supplierName =
                                escapeHtml(

                                    invoice.suppliers
                                        ?.supplier_name

                                    ||

                                    "Deleted Supplier"

                                );


                            /* =============================
                               INVOICE NUMBER
                            ============================= */

                            const number =
                                escapeHtml(

                                    invoice.invoice_number

                                    ||

                                    "No Number"

                                );


                            /* =============================
                               DATE
                            ============================= */

                            const date =
                                invoice.invoice_date

                                ||

                                "—";


                            /* =============================
                               FINANCIAL VALUES
                            ============================= */

                            const total =
                                Number(
                                    invoice.total_amount || 0
                                );


                            const paid =
                                Number(
                                    invoice.paid_amount || 0
                                );


                            const remaining =
                                Number(
                                    invoice.remaining_amount || 0
                                );


                            /* =============================
                               STATUS
                            ============================= */

                            let statusClass =
                                "unpaid";


                            let statusText =
                                "Unpaid";


                            let statusIcon =
                                "fa-clock";


                            if(
                                remaining <= 0
                            ){

                                statusClass =
                                    "paid";

                                statusText =
                                    "Paid";

                                statusIcon =
                                    "fa-circle-check";

                            }

                            else if(
                                paid > 0
                            ){

                                statusClass =
                                    "partial";

                                statusText =
                                    "Partial";

                                statusIcon =
                                    "fa-circle-half-stroke";

                            }


                            /* =============================
                               INVOICE CARD
                            ============================= */

                            return `

                                <div

                                    class="
                                        purchase-invoice-record
                                        ${statusClass}
                                    "

                                    onclick="
                                        openPurchaseInvoiceDetails(
                                            ${invoice.id}
                                        )
                                    "

                                >

                                    <!-- LEFT -->

                                    <div
                                        class="
                                            purchase-invoice-record-left
                                        "
                                    >

                                        <div
                                            class="
                                                purchase-invoice-record-icon
                                            "
                                        >

                                            <i
                                                class="
                                                    fa-solid
                                                    fa-file-invoice
                                                "
                                            ></i>

                                        </div>


                                        <div
                                            class="
                                                purchase-invoice-record-info
                                            "
                                        >

                                            <div
                                                class="
                                                    purchase-invoice-record-title
                                                "
                                            >

                                                <strong>
                                                    #${number}
                                                </strong>


                                                <span
                                                    class="
                                                        purchase-invoice-record-status
                                                        ${statusClass}
                                                    "
                                                >

                                                    <i
                                                        class="
                                                            fa-solid
                                                            ${statusIcon}
                                                        "
                                                    ></i>

                                                    ${statusText}

                                                </span>

                                            </div>


                                            <div
                                                class="
                                                    purchase-invoice-record-supplier
                                                "
                                            >

                                                <span
                                                    class="
                                                        purchase-invoice-supplier-avatar
                                                    "
                                                >

                                                    <i
                                                        class="
                                                            fa-solid
                                                            fa-truck-field
                                                        "
                                                    ></i>

                                                </span>


                                                <strong>
                                                    ${supplierName}
                                                </strong>

                                            </div>


                                            <div
                                                class="
                                                    purchase-invoice-record-date
                                                "
                                            >

                                                <i
                                                    class="
                                                        fa-regular
                                                        fa-calendar
                                                    "
                                                ></i>

                                                ${date}

                                            </div>

                                        </div>

                                    </div>


                                    <!-- FINANCIAL -->

                                    <div
                                        class="
                                            purchase-invoice-record-financial
                                        "
                                    >

                                        <!-- TOTAL -->

                                        <div
                                            class="
                                                purchase-invoice-financial-box
                                            "
                                        >

                                            <span>
                                                Total
                                            </span>

                                            <strong>

                                                ${formatPurchaseMoney(
                                                    total
                                                )}

                                                <small>
                                                    EGP
                                                </small>

                                            </strong>

                                        </div>


                                        <!-- PAID -->

                                        <div
                                            class="
                                                purchase-invoice-financial-box
                                                paid
                                            "
                                        >

                                            <span>
                                                Paid
                                            </span>

                                            <strong>

                                                ${formatPurchaseMoney(
                                                    paid
                                                )}

                                                <small>
                                                    EGP
                                                </small>

                                            </strong>

                                        </div>


                                        <!-- REMAINING -->

                                        <div
                                            class="
                                                purchase-invoice-financial-box
                                                remaining
                                            "
                                        >

                                            <span>
                                                Remaining
                                            </span>

                                            <strong>

                                                ${formatPurchaseMoney(
                                                    remaining
                                                )}

                                                <small>
                                                    EGP
                                                </small>

                                            </strong>

                                        </div>

                                    </div>


                                    <!-- ACTIONS -->

                                    <div
                                        class="
                                            purchase-invoice-record-actions
                                        "

                                        onclick="
                                            event.stopPropagation()
                                        "
                                    >

                                       


                                        <!-- DELETE -->

                                        <button

                                            type="button"

                                            class="
                                                purchase-invoice-action-btn
                                                delete
                                            "

                                            title="Delete Invoice"

                                            onclick="
                                                deletePurchaseInvoice(
                                                    ${invoice.id}
                                                )
                                            "

                                        >

                                            <i
                                                class="
                                                    fa-solid
                                                    fa-trash
                                                "
                                            ></i>

                                        </button>

                                    </div>


                                    <!-- ARROW -->

                                    <div
                                        class="
                                            purchase-invoice-record-arrow
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-chevron-right
                                            "
                                        ></i>

                                    </div>

                                </div>

                            `;

                        }

                    ).join("");


                /* =========================================
                   MONTH DETAILS
                ========================================= */

                return `

                    <details

                        class="
                            purchase-month-details
                        "

                        ${openAttr}

                    >

                        <summary

                            class="
                                purchase-month-summary
                            "

                        >

                            <!-- MONTH -->

                            <div
                                class="
                                    purchase-month-summary-main
                                "
                            >

                                <div
                                    class="
                                        purchase-month-icon
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-calendar-days
                                        "
                                    ></i>

                                </div>


                                <div
                                    class="
                                        purchase-month-title
                                    "
                                >

                                    <strong>
                                        ${month.label}
                                    </strong>

                                    <span>

                                        ${invoiceCount}

                                        ${
                                            invoiceCount === 1
                                                ? "invoice"
                                                : "invoices"
                                        }

                                    </span>

                                </div>

                            </div>


                            <!-- MONTH STATS -->

                            <div
                                class="
                                    purchase-month-stats
                                "
                            >

                                <!-- INVOICES -->

                                <div
                                    class="
                                        purchase-month-stat
                                    "
                                >

                                    <span>
                                        Invoices
                                    </span>

                                    <strong>
                                        ${invoiceCount}
                                    </strong>

                                </div>


                                <!-- TOTAL -->

                                <div
                                    class="
                                        purchase-month-stat
                                    "
                                >

                                    <span>
                                        Total
                                    </span>

                                    <strong>

                                        ${formatPurchaseMoney(
                                            monthTotal
                                        )}

                                        <small>
                                            EGP
                                        </small>

                                    </strong>

                                </div>


                                <!-- PAID -->

                                <div
                                    class="
                                        purchase-month-stat
                                        paid
                                    "
                                >

                                    <span>
                                        Paid
                                    </span>

                                    <strong>

                                        ${formatPurchaseMoney(
                                            monthPaid
                                        )}

                                        <small>
                                            EGP
                                        </small>

                                    </strong>

                                </div>


                                <!-- REMAINING -->

                                <div
                                    class="
                                        purchase-month-stat
                                        remaining
                                    "
                                >

                                    <span>
                                        Remaining
                                    </span>

                                    <strong>

                                        ${formatPurchaseMoney(
                                            monthRemaining
                                        )}

                                        <small>
                                            EGP
                                        </small>

                                    </strong>

                                </div>


                                <!-- SUPPLIERS -->

                                <div
                                    class="
                                        purchase-month-stat
                                    "
                                >

                                    <span>
                                        Suppliers
                                    </span>

                                    <strong>
                                        ${supplierCount}
                                    </strong>

                                </div>

                            </div>


                            <!-- ARROW -->

                            <div
                                class="
                                    purchase-month-arrow
                                "
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-chevron-down
                                    "
                                ></i>

                            </div>

                        </summary>


                        <!-- MONTH INVOICES -->

                        <div
                            class="
                                purchase-month-invoices
                            "
                        >

                            ${invoicesHTML}

                        </div>

                    </details>

                `;

            }

        ).join("");

}
/* =========================================================
   DELETE PURCHASE INVOICE
========================================================= */

async function deletePurchaseInvoice(invoiceId){

    const userId =
        await getUserId();


    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    if(!invoiceId){

        showToast(
            "Invalid invoice"
        );

        return;

    }


    /* =====================================================
       CONFIRM
    ===================================================== */

    const confirmed =
        await showConfirm(
            "Are you sure you want to delete this purchase invoice?\n\n" +
            "The invoice, its payments, and its inventory purchases will be removed."
        );


    if(!confirmed){

        return;

    }


    try{

        /* =================================================
           1. LOAD INVOICE
        ================================================= */

        const {
            data: invoice,
            error: invoiceError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                invoice_number,
                supplier_id,
                total_amount
            `)

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(invoiceError){

            throw invoiceError;

        }


        if(!invoice){

            throw new Error(
                "Invoice not found"
            );

        }


        /* =================================================
           2. LOAD PURCHASE HISTORY
        ================================================= */

        const {
            data: purchases,
            error: purchasesError
        } =
        await supabaseClient

            .from(
                "inventory_purchases"
            )

            .select(`
                id,
                inventory_item_id,
                purchased_quantity,
                unit_price
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            );


        if(purchasesError){

            throw purchasesError;

        }


        /* =================================================
           3. ROLLBACK INVENTORY
        ================================================= */

        for(
            const purchase
            of (purchases || [])
        ){

            const {
                data: inventoryItem,
                error: inventoryError
            } =
            await supabaseClient

                .from(
                    "inventory_items"
                )

                .select(`
                    id,
                    quantity,
                    purchased_quantity,
                    low_stock_threshold
                `)

                .eq(
                    "id",
                    purchase.inventory_item_id
                )

                .eq(
                    "user_id",
                    userId
                )

                .single();


            if(inventoryError){

                throw inventoryError;

            }


            if(!inventoryItem){

                continue;

            }


            const currentQuantity =
                Number(
                    inventoryItem.quantity
                    || 0
                );


            const currentPurchasedQuantity =
                Number(
                    inventoryItem.purchased_quantity
                    || 0
                );


            const purchasedQuantity =
                Number(
                    purchase.purchased_quantity
                    || 0
                );


            const newQuantity =
                Math.max(
                    currentQuantity
                    -
                    purchasedQuantity,
                    0
                );


            const newPurchasedQuantity =
                Math.max(
                    currentPurchasedQuantity
                    -
                    purchasedQuantity,
                    0
                );


            /* =============================================
               FIND REMAINING PURCHASES
            ============================================= */

            const {
                data: remainingPurchases,
                error: remainingError
            } =
            await supabaseClient

                .from(
                    "inventory_purchases"
                )

                .select(`
                    purchased_quantity,
                    unit_price
                `)

                .eq(
                    "user_id",
                    userId
                )

                .eq(
                    "inventory_item_id",
                    purchase.inventory_item_id
                )
                
                .neq(
                    "purchase_invoice_id",
                    invoiceId
                );


            if(remainingError){

                throw remainingError;

            }


            /* =============================================
               RECALCULATE AVERAGE COST
            ============================================= */

            let remainingCost = 0;

            let remainingPurchasedQuantity = 0;


            (remainingPurchases || [])
                .forEach(
                    remainingPurchase => {

                        const quantity =
                            Number(
                                remainingPurchase.purchased_quantity
                                || 0
                            );


                        const price =
                            Number(
                                remainingPurchase.unit_price
                                || 0
                            );


                        remainingPurchasedQuantity +=
                            quantity;


                        remainingCost +=
                            quantity *
                            price;

                    }
                );


            const newAveragePrice =
                remainingPurchasedQuantity > 0
                ?
                (
                    remainingCost /
                    remainingPurchasedQuantity
                )
                :
                0;


            /* =============================================
               UPDATE INVENTORY
            ============================================= */

            const {
                error: inventoryUpdateError
            } =
            await supabaseClient

                .from(
                    "inventory_items"
                )

                .update({

                    quantity:
                        newQuantity,

                    purchased_quantity:
                        newPurchasedQuantity,

                    unit_price:
                        Number(
                            newAveragePrice
                                .toFixed(4)
                        ),

                    updated_at:
                        new Date()
                            .toISOString()

                })

                .eq(
                    "id",
                    inventoryItem.id
                )

                .eq(
                    "user_id",
                    userId
                );


            if(inventoryUpdateError){

                throw inventoryUpdateError;

            }

        }


        /* =================================================
           4. DELETE PURCHASE HISTORY
        ================================================= */

        const {
            error: purchaseDeleteError
        } =
        await supabaseClient

            .from(
                "inventory_purchases"
            )

            .delete()

            .eq(
                "purchase_invoice_id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(purchaseDeleteError){

            throw purchaseDeleteError;

        }


        /* =================================================
           5. DELETE PAYMENTS
        ================================================= */

        const {
            error: paymentDeleteError
        } =
        await supabaseClient

            .from(
                "purchase_invoice_payments"
            )

            .delete()

            .eq(
                "purchase_invoice_id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(paymentDeleteError){

            throw paymentDeleteError;

        }


        /* =================================================
           6. DELETE INVOICE
        ================================================= */

        const {
            error: invoiceDeleteError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .delete()

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(invoiceDeleteError){

            throw invoiceDeleteError;

        }


        /* =================================================
           7. SUCCESS
        ================================================= */

        showToast(
            "Purchase invoice deleted successfully"
        );


        /* =================================================
           8. REFRESH
        ================================================= */

        await loadInventory();

        await loadInventoryItemNames();

        await loadPurchaseInvoices();


    }
    catch(error){

        console.error(
            "Delete purchase invoice error:",
            error
        );


        showToast(
            error?.message
            ||
            "Failed to delete purchase invoice"
        );

    }

}

/* =========================================================
   UPDATE RECORDS SUMMARY
========================================================= */

function updatePurchaseRecordsSummary(
    invoices
){

    const count =
        document.getElementById(
            "purchaseRecordsCount"
        );


    const total =
        document.getElementById(
            "purchaseRecordsTotal"
        );


    const paid =
        document.getElementById(
            "purchaseRecordsPaid"
        );


    const remaining =
        document.getElementById(
            "purchaseRecordsRemaining"
        );


    const values =
        invoices || [];


    const totalAmount =
        values.reduce(
            (
                sum,
                invoice
            ) =>
                sum +
                Number(
                    invoice.total_amount
                    || 0
                ),
            0
        );


    const paidAmount =
        values.reduce(
            (
                sum,
                invoice
            ) =>
                sum +
                Number(
                    invoice.paid_amount
                    || 0
                ),
            0
        );


    const remainingAmount =
        values.reduce(
            (
                sum,
                invoice
            ) =>
                sum +
                Number(
                    invoice.remaining_amount
                    || 0
                ),
            0
        );


    if(count){

        count.textContent =
            values.length;

    }


    if(total){

        total.textContent =
            `${formatPurchaseMoney(totalAmount)} EGP`;

    }


    if(paid){

        paid.textContent =
            `${formatPurchaseMoney(paidAmount)} EGP`;

    }


    if(remaining){

        remaining.textContent =
            `${formatPurchaseMoney(remainingAmount)} EGP`;

    }

}



/* =========================================================
   FILTER PURCHASE INVOICES
========================================================= */

function filterPurchaseInvoices(){

    const searchInput =
        document.getElementById(
            "purchaseInvoiceSearch"
        );


    const supplierFilter =
        document.getElementById(
            "purchaseInvoiceSupplierFilter"
        );


    const search =
        (
            searchInput?.value
            ||
            ""
        )
        .trim()
        .toLowerCase();


    const supplierId =
        supplierFilter?.value
        ||
        "";


    const filtered =
        (
            window.purchaseInvoicesCache
            ||
            []
        )
        .filter(
            invoice => {

                const supplierName =
                    String(
                        invoice.suppliers
                            ?.supplier_name
                        ||
                        ""
                    )
                    .toLowerCase();


                const invoiceNumber =
                    String(
                        invoice.invoice_number
                        ||
                        ""
                    )
                    .toLowerCase();


                const notes =
                    String(
                        invoice.notes
                        ||
                        ""
                    )
                    .toLowerCase();


                const matchesSearch =
                    !search
                    ||
                    supplierName.includes(
                        search
                    )
                    ||
                    invoiceNumber.includes(
                        search
                    )
                    ||
                    notes.includes(
                        search
                    );


                const matchesSupplier =
                    !supplierId
                    ||
                    String(
                        invoice.supplier_id
                    )
                    ===
                    String(
                        supplierId
                    );


                return (
                    matchesSearch
                    &&
                    matchesSupplier
                );

            }
        );


    renderPurchaseInvoices(
        filtered
    );

}



/* =========================================================
   LOAD PURCHASE INVOICE DETAILS
========================================================= */

async function loadPurchaseInvoiceDetails(
    invoiceId
){

    const userId =
        await getUserId();


    if(!userId){
        return;
    }


    invoiceId =
        Number(invoiceId);


    try{

        /* =============================================
           LOAD INVOICE
        ============================================= */

        const {
            data: invoice,
            error: invoiceError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                user_id,
                supplier_id,
                invoice_number,
                invoice_date,
                subtotal,
                discount,
                total_amount,
                paid_amount,
                remaining_amount,
                notes,
                suppliers (
                    supplier_name
                )
            `)

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(invoiceError){
            throw invoiceError;
        }


        /* =============================================
           LOAD PURCHASE ITEMS
        ============================================= */

        const {
            data: purchases,
            error: purchasesError
        } =
        await supabaseClient

            .from(
                "inventory_purchases"
            )

            .select(`
                id,
                inventory_item_id,
                purchased_quantity,
                unit_price,
                total_purchase_price,
                created_at,
                inventory_items (
                    item_name
                )
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            )

            .order(
                "id",
                {
                    ascending: true
                }
            );


        if(purchasesError){
            throw purchasesError;
        }


        /* =============================================
           LOAD PAYMENTS
        ============================================= */

        const {
            data: payments,
            error: paymentsError
        } =
        await supabaseClient

            .from(
                "purchase_invoice_payments"
            )

            .select(`
                id,
                amount,
                payment_date,
                notes,
                created_at
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            )

            .order(
                "payment_date",
                {
                    ascending: false
                }
            )
            .order(
                "id",
                {
                    ascending: false
                });


        if(paymentsError){
            throw paymentsError;
        }


        /* =============================================
           RENDER HEADER
        ============================================= */

        renderPurchaseInvoiceDetailsHeader(
            invoice
        );


        /* =============================================
           RENDER ITEMS
        ============================================= */

        renderPurchaseInvoiceDetailsItems(
            purchases || []
        );


        /* =============================================
           RENDER PAYMENTS
        ============================================= */

        renderPurchaseInvoicePayments(
            payments || []
        );


        /* =============================================
           NOTES
        ============================================= */

        const notes =
            document.getElementById(
                "purchaseDetailsNotes"
            );


        if(notes){

            notes.textContent =
                invoice.notes
                ||
                "No notes";

        }


    }
    catch(error){

        console.error(
            "Purchase invoice details error:",
            error
        );


        showToast(
            error?.message ||
            "Failed to load invoice details"
        );

    }

}



/* =========================================================
   RENDER DETAILS HEADER
========================================================= */

function renderPurchaseInvoiceDetailsHeader(
    invoice
){

    const number =
        document.getElementById(
            "purchaseDetailsInvoiceNumber"
        );


    const supplier =
        document.getElementById(
            "purchaseDetailsSupplier"
        );


    const date =
        document.getElementById(
            "purchaseDetailsDate"
        );


    const subtitle =
        document.getElementById(
            "purchaseDetailsSubtitle"
        );


    const subtotal =
        document.getElementById(
            "purchaseDetailsSubtotal"
        );


    const discount =
        document.getElementById(
            "purchaseDetailsDiscount"
        );


    const total =
        document.getElementById(
            "purchaseDetailsTotal"
        );


    const paid =
        document.getElementById(
            "purchaseDetailsPaid"
        );


    const remaining =
        document.getElementById(
            "purchaseDetailsRemaining"
        );


    const status =
        document.getElementById(
            "purchaseDetailsStatus"
        );


    const invoiceNumber =
        invoice.invoice_number
        ||
        "No Number";


    const supplierName =
        invoice.suppliers
            ?.supplier_name
        ||
        "Unknown Supplier";


    const totalAmount =
        Number(
            invoice.total_amount
            || 0
        );


    const paidAmount =
        Number(
            invoice.paid_amount
            || 0
        );


    const remainingAmount =
        Number(
            invoice.remaining_amount
            || 0
        );


    if(number){

        number.textContent =
            `#${invoiceNumber}`;

    }


    if(supplier){

        supplier.textContent =
            supplierName;

    }


    if(date){

        date.textContent =
            invoice.invoice_date
            ||
            "—";

    }


    if(subtitle){

        subtitle.textContent =
            `${supplierName} • Invoice #${invoiceNumber}`;

    }


    if(subtotal){

        subtotal.textContent =
            `${formatPurchaseMoney(
                invoice.subtotal
            )} EGP`;

    }


    if(discount){

        discount.textContent =
            `${formatPurchaseMoney(
                invoice.discount
            )} EGP`;

    }


    if(total){

        total.textContent =
            `${formatPurchaseMoney(
                totalAmount
            )} EGP`;

    }


    if(paid){

        paid.textContent =
            `${formatPurchaseMoney(
                paidAmount
            )} EGP`;

    }


    if(remaining){

        remaining.textContent =
            `${formatPurchaseMoney(
                remainingAmount
            )} EGP`;

    }


    if(status){

        status.className =
            "purchase-payment-status";


        if(remainingAmount <= 0){

            status.classList.add(
                "paid"
            );

            status.textContent =
                "Paid";

        }
        else if(paidAmount > 0){

            status.classList.add(
                "partial"
            );

            status.textContent =
                "Partially Paid";

        }
        else{

            status.classList.add(
                "unpaid"
            );

            status.textContent =
                "Unpaid";

        }

    }

}



/* =========================================================
   RENDER PURCHASE ITEMS
========================================================= */

function renderPurchaseInvoiceDetailsItems(
    purchases
){

    const container =
        document.getElementById(
            "purchaseInvoiceDetailsItems"
        );


    if(!container){
        return;
    }


    if(!purchases.length){

        container.innerHTML = `

            <div class="storage-empty">

                No items found.

            </div>

        `;

        return;

    }

container.innerHTML =
    purchases.map(
        purchase => {

            const itemName =
                escapeHtml(
                    purchase.inventory_items
                        ?.item_name
                    ||
                    "Unknown Item"
                );


            const quantity =
                Number(
                    purchase.purchased_quantity
                    || 0
                );


            const unitPrice =
                Number(
                    purchase.unit_price
                    || 0
                );


            const total =
                Number(
                    purchase.total_purchase_price
                    ??
                    (
                        quantity *
                        unitPrice
                    )
                );


            return `

                <div
                    class="purchase-details-item-card"
                >

                    <!-- =================================================
                         ITEM ICON
                    ================================================= -->

                    <div
                        class="purchase-details-item-avatar"
                    >

                        <i
                            class="
                                fa-solid
                                fa-box-open
                            "
                        ></i>

                    </div>


                    <!-- =================================================
                         ITEM INFORMATION
                    ================================================= -->

                    <div
                        class="purchase-details-item-content"
                    >

                        <div
                            class="purchase-details-item-title"
                        >

                            <strong>
                                ${itemName}
                            </strong>

                            <span>
                                Purchased Item
                            </span>

                        </div>


                        <!-- =================================================
                             META
                        ================================================= -->

                        <div
                            class="purchase-details-item-meta"
                        >

                            <div
                                class="purchase-item-meta-box"
                            >

                                <span>
                                    Quantity
                                </span>

                                <strong>
                                    ${formatPurchaseMoney(
                                        quantity
                                    )}
                                </strong>

                            </div>


                            <div
                                class="purchase-item-meta-box"
                            >

                                <span>
                                    Unit Price
                                </span>

                                <strong>

                                    ${formatPurchaseMoney(
                                        unitPrice
                                    )}

                                    <small>
                                        EGP
                                    </small>

                                </strong>

                            </div>

                        </div>

                    </div>


                    <!-- =================================================
                         TOTAL
                    ================================================= -->

                    <div
                        class="purchase-details-item-price"
                    >

                        <span>
                            Total
                        </span>

                        <strong>

                            ${formatPurchaseMoney(
                                total
                            )}

                            <small>
                                EGP
                            </small>

                        </strong>

                    </div>

                </div>

            `;

        }
    )
    .join("");

}



/* =========================================================
   RENDER PAYMENT HISTORY
========================================================= */

function renderPurchaseInvoicePayments(
    payments
){

    const container =
        document.getElementById(
            "purchaseInvoicePaymentsList"
        );


    if(!container){
        return;
    }


    if(!payments.length){

        container.innerHTML = `

            <div class="storage-empty">

                <i
                    class="
                        fa-solid
                        fa-money-bill-wave
                    "
                ></i>

                No payments recorded yet.

            </div>

        `;

        return;

    }


   container.innerHTML =
    payments.map(
        payment => {

            const amount =
                Number(
                    payment.amount || 0
                );


            const date =
                payment.payment_date
                ||
                "—";


            const notes =
                payment.notes
                ?
                escapeHtml(
                    payment.notes
                )
                :
                "";


            return `

                <div
                    class="purchase-payment-card"
                >

                    <!-- =================================================
                         ICON
                    ================================================= -->

                    <div
                        class="purchase-payment-card-icon"
                    >

                        <i
                            class="
                                fa-solid
                                fa-money-bill-transfer
                            "
                        ></i>

                    </div>


                    <!-- =================================================
                         MAIN CONTENT
                    ================================================= -->

                    <div
                        class="purchase-payment-card-content"
                    >

                        <div
                            class="purchase-payment-card-top"
                        >

                            <div>

                                <span
                                    class="
                                        purchase-payment-label
                                    "
                                >
                                    Payment
                                </span>


                                <strong
                                    class="
                                        purchase-payment-amount
                                    "
                                >

                                    ${formatPurchaseMoney(
                                        amount
                                    )}

                                    <small>
                                        EGP
                                    </small>

                                </strong>

                            </div>


                            <!-- DATE -->

                            <div
                                class="
                                    purchase-payment-date
                                "
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-calendar-day
                                    "
                                ></i>

                                <span>
                                    ${date}
                                </span>

                            </div>

                        </div>


                        <!-- =================================================
                             NOTE
                        ================================================= -->

                        ${
                            notes
                            ?
                            `

                            <div
                                class="
                                    purchase-payment-note
                                "
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-note-sticky
                                    "
                                ></i>

                                <span>
                                    ${notes}
                                </span>

                            </div>

                            `
                            :
                            ""
                        }


                    </div>


                    <!-- =================================================
                         STATUS
                    ================================================= -->

                    <div
                        class="
                            purchase-payment-status-badge
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-circle-check
                            "
                        ></i>

                        Paid

                    </div>

                </div>

            `;

        }
    )
    .join("");
}



/* =========================================================
   LOAD PAYMENT INVOICE PREVIEW
========================================================= */

async function loadPurchasePaymentInvoicePreview(
    invoiceId
){

    const userId =
        await getUserId();


    if(!userId){
        return;
    }


    try{

        const {
            data: invoice,
            error
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                invoice_number,
                total_amount,
                paid_amount,
                remaining_amount
            `)

            .eq(
                "id",
                Number(invoiceId)
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(error){
            throw error;
        }


        const number =
            document.getElementById(
                "purchasePaymentInvoiceNumber"
            );


        const remaining =
            document.getElementById(
                "purchasePaymentRemaining"
            );


        if(number){

            number.textContent =
                `#${invoice.invoice_number || "No Number"}`;

        }


        if(remaining){

            remaining.textContent =
                `${formatPurchaseMoney(
                    invoice.remaining_amount
                )} EGP`;

        }


        const amountInput =
            document.getElementById(
                "purchasePaymentAmount"
            );


        if(
            amountInput
            &&
            Number(
                invoice.remaining_amount
            ) > 0
        ){

            amountInput.max =
                Number(
                    invoice.remaining_amount
                );

        }

    }
    catch(error){

        console.error(
            "Payment preview error:",
            error
        );

        showToast(
            error?.message ||
            "Failed to load invoice"
        );

    }

}



/* =========================================================
   SAVE PURCHASE PAYMENT
========================================================= */

async function savePurchasePayment(){

    const userId =
        await getUserId();


    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    const invoiceId =
        Number(
            document.getElementById(
                "purchasePaymentInvoiceId"
            )?.value
        );


    const amount =
        Number(
            document.getElementById(
                "purchasePaymentAmount"
            )?.value
            ||
            0
        );


    const paymentDate =
        document.getElementById(
            "purchasePaymentDate"
        )?.value
        ||
        getPurchaseToday();


    const notes =
        document.getElementById(
            "purchasePaymentNotes"
        )?.value
        ?.trim()
        ||
        null;


    if(!invoiceId){

        showToast(
            "Invoice not found"
        );

        return;

    }


    if(
        !Number.isFinite(amount)
        ||
        amount <= 0
    ){

        showToast(
            "Enter a valid payment amount"
        );

        return;

    }


    if(!paymentDate){

        showToast(
            "Select payment date"
        );

        return;

    }


    const saveButton =
        document.querySelector(
            "#purchasePaymentModal .storage-save-btn"
        );


    if(saveButton){

        saveButton.disabled =
            true;


        saveButton.innerHTML = `

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Saving...

        `;

    }


    try{

        /* =============================================
           LOAD CURRENT INVOICE
        ============================================= */

        const {
            data: invoice,
            error: invoiceError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                total_amount,
                paid_amount,
                remaining_amount
            `)

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(invoiceError){
            throw invoiceError;
        }


        const remaining =
            Number(
                invoice.remaining_amount
                || 0
            );


        if(amount > remaining){

            showToast(
                `Payment cannot exceed remaining amount (${formatPurchaseMoney(remaining)} EGP)`
            );

            return;

        }


        /* =============================================
           INSERT PAYMENT
        ============================================= */

        const {
            error: paymentError
        } =
        await supabaseClient

            .from(
                "purchase_invoice_payments"
            )

            .insert({

                user_id:
                    userId,

                purchase_invoice_id:
                    invoiceId,

                amount:
                    amount,

                payment_date:
                    paymentDate,

                notes:
                    notes

            });


        if(paymentError){
            throw paymentError;
        }


        /* =============================================
           CALCULATE NEW PAYMENT TOTAL
        ============================================= */

        const {
            data: payments,
            error: paymentsError
        } =
        await supabaseClient

            .from(
                "purchase_invoice_payments"
            )

            .select(`
                amount
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "purchase_invoice_id",
                invoiceId
            );


        if(paymentsError){
            throw paymentsError;
        }


        const totalPaid =
            (payments || [])
                .reduce(
                    (
                        sum,
                        payment
                    ) =>
                        sum +
                        Number(
                            payment.amount
                            || 0
                        ),
                    0
                );


        const total =
            Number(
                invoice.total_amount
                || 0
            );


        const newRemaining =
            Math.max(
                total
                -
                totalPaid,
                0
            );


        /* =============================================
           UPDATE INVOICE
        ============================================= */

        const {
            error: updateError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .update({

                paid_amount:
                    totalPaid,

                remaining_amount:
                    newRemaining,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(updateError){
            throw updateError;
        }


        showToast(
            "Payment added successfully"
        );


        closePurchasePaymentModal();


        /* =============================================
           REFRESH DETAILS
        ============================================= */

        await loadPurchaseInvoiceDetails(
            invoiceId
        );

        await updateInventoryStats();
        /* =============================================
           REFRESH RECORDS
        ============================================= */

        await loadPurchaseInvoices();


    }
    catch(error){

        console.error(
            "Save purchase payment error:",
            error
        );


        showToast(
            error?.message ||
            "Failed to save payment"
        );

    }
    finally{

        if(saveButton){

            saveButton.disabled =
                false;


            saveButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Save Payment

            `;

        }

    }

}



/* =========================================================
   LOAD DISCOUNT DATA
========================================================= */

async function loadPurchaseDiscountData(
    invoiceId
){

    const userId =
        await getUserId();


    if(!userId){
        return;
    }


    try{

        const {
            data: invoice,
            error
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                invoice_number,
                subtotal,
                discount,
                total_amount
            `)

            .eq(
                "id",
                Number(invoiceId)
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(error){
            throw error;
        }


        const number =
            document.getElementById(
                "purchaseDiscountInvoiceNumber"
            );


        const total =
            document.getElementById(
                "purchaseDiscountCurrentTotal"
            );


        const discountInput =
            document.getElementById(
                "purchaseEditDiscount"
            );


        if(number){

            number.textContent =
                `#${invoice.invoice_number || "No Number"}`;

        }


        if(total){

            total.textContent =
                `${formatPurchaseMoney(
                    invoice.total_amount
                )} EGP`;

        }


        if(discountInput){

            discountInput.value =
                Number(
                    invoice.discount
                    || 0
                );

            discountInput.max =
                Number(
                    invoice.subtotal
                    || 0
                );

        }

    }
    catch(error){

        console.error(
            "Load discount data error:",
            error
        );


        showToast(
            error?.message ||
            "Failed to load invoice"
        );

    }

}



/* =========================================================
   SAVE PURCHASE INVOICE DISCOUNT
========================================================= */

async function savePurchaseInvoiceDiscount(){

    const userId =
        await getUserId();


    if(!userId){

        showToast(
            "User not found"
        );

        return;

    }


    const invoiceId =
        Number(
            document.getElementById(
                "purchaseDiscountInvoiceId"
            )?.value
        );


    const discount =
        Math.max(
            Number(
                document.getElementById(
                    "purchaseEditDiscount"
                )?.value
                ||
                0
            ),
            0
        );


    if(!invoiceId){

        showToast(
            "Invoice not found"
        );

        return;

    }


    if(
        !Number.isFinite(discount)
    ){

        showToast(
            "Enter a valid discount"
        );

        return;

    }


    const saveButton =
        document.querySelector(
            "#purchaseDiscountModal .storage-save-btn"
        );


    if(saveButton){

        saveButton.disabled =
            true;


        saveButton.innerHTML = `

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Saving...

        `;

    }


    try{

        /* =============================================
           LOAD INVOICE
        ============================================= */

        const {
            data: invoice,
            error: invoiceError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .select(`
                id,
                subtotal,
                paid_amount
            `)

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(invoiceError){
            throw invoiceError;
        }


        const subtotal =
            Number(
                invoice.subtotal
                || 0
            );


        if(discount > subtotal){

            showToast(
                "Discount cannot exceed subtotal"
            );

            return;

        }


        const total =
            Math.max(
                subtotal
                -
                discount,
                0
            );


        /* =============================================
           IMPORTANT
           Existing paid amount cannot exceed new total
        ============================================= */

        let paid =
            Number(
                invoice.paid_amount
                || 0
            );


        if(paid > total){

            paid =
                total;

        }


        const remaining =
            Math.max(
                total
                -
                paid,
                0
            );


        /* =============================================
           UPDATE INVOICE
        ============================================= */

        const {
            error: updateError
        } =
        await supabaseClient

            .from(
                "purchase_invoices"
            )

            .update({

                discount:
                    discount,

                total_amount:
                    total,

                paid_amount:
                    paid,

                remaining_amount:
                    remaining,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                invoiceId
            )

            .eq(
                "user_id",
                userId
            );


        if(updateError){
            throw updateError;
        }


        showToast(
            "Discount updated successfully"
        );


        closePurchaseDiscountModal();


        /* =============================================
           REFRESH
        ============================================= */

        await loadPurchaseInvoiceDetails(
            invoiceId
        );


        await loadPurchaseInvoices();


    }
    catch(error){

        console.error(
            "Save purchase discount error:",
            error
        );


        showToast(
            error?.message ||
            "Failed to update discount"
        );

    }
    finally{

        if(saveButton){

            saveButton.disabled =
                false;


            saveButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Save Discount

            `;

        }

    }

}



/* =========================================================
   OPEN RECORDS DIRECTLY
========================================================= */

async function openPurchaseRecords(){

    openPurchaseInvoicesModal();

}



/* =========================================================
   REFRESH CURRENT INVOICE DETAILS
========================================================= */

async function refreshCurrentPurchaseInvoice(){

    if(
        !window.currentPurchaseInvoiceId
    ){
        return;
    }


    await loadPurchaseInvoiceDetails(
        window.currentPurchaseInvoiceId
    );

}



/* =========================================================
   CLOSE CHILD MODALS WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    function(event){

        const modalIds = [

            "purchaseInvoicesModal",

            "purchaseInvoiceDetailsModal",

            "purchasePaymentModal",

            "purchaseDiscountModal"

        ];


        modalIds.forEach(
            id => {

                const modal =
                    document.getElementById(
                        id
                    );


                if(
                    !modal
                    ||
                    modal.style.display !== "flex"
                ){

                    return;

                }


                /*
                   Only close when clicking
                   directly on the overlay.
                */

                if(
                    event.target === modal
                ){

                    if(
                        id ===
                        "purchaseInvoicesModal"
                    ){

                        closePurchaseInvoicesModal();

                    }


                    else if(
                        id ===
                        "purchaseInvoiceDetailsModal"
                    ){

                        closePurchaseInvoiceDetails();

                    }


                    else if(
                        id ===
                        "purchasePaymentModal"
                    ){

                        closePurchasePaymentModal();

                    }


                    else if(
                        id ===
                        "purchaseDiscountModal"
                    ){

                        closePurchaseDiscountModal();

                    }

                }

            }
        );

    }
);

function closeAddItemModal(){

    const modal =
        document.getElementById(
            "addItemModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }


    const itemsContainer =
        document.getElementById(
            "purchaseInvoiceItems"
        );


    if(itemsContainer){

        itemsContainer.innerHTML =
            "";

    }

}

/* =========================================================
   PURCHASE INVOICE — SUPPLIERS
========================================================= */

async function loadPurchaseSuppliers(){

    const userId =
        await getUserId();

    if(!userId) return;


    const select =
        document.getElementById(
            "purchaseSupplier"
        );

    if(!select) return;


    select.innerHTML = `

        <option value="">
            Loading suppliers...
        </option>

    `;


    const {
        data,
        error
    } =
    await supabaseClient

        .from("suppliers")

        .select(`
            id,
            supplier_name
        `)

        .eq(
            "user_id",
            userId
        )

        .order(
            "supplier_name",
            {
                ascending:true
            }
        );


    if(error){

        console.error(
            "Suppliers error:",
            error
        );


        select.innerHTML = `

            <option value="">
                Failed to load suppliers
            </option>

        `;

        return;

    }


    select.innerHTML = `

        <option value="">
            Select Supplier
        </option>

        ${
            (data || [])
                .map(
                    supplier => `

                        <option
                            value="${supplier.id}"
                        >

                            ${escapeHtml(
                                supplier.supplier_name
                            )}

                        </option>

                    `
                )
                .join("")
        }

    `;

}

async function saveInventoryItem(){


const userId =
    await getUserId();


if(!userId){

    showToast(
        "User not found"
    );

    return;

}


/* =====================================================
   GET FORM VALUES
===================================================== */

const itemName =
    document.getElementById(
        "itemName"
    )?.value
    ?.trim();


const purchasedQuantity =
    Number(
        document.getElementById(
            "purchasedQuantity"
        )?.value
    );


const unitPrice =
    Number(
        document.getElementById(
            "unitPrice"
        )?.value
    );


const lowStockThreshold =
    Number(
        document.getElementById(
            "lowStockThreshold"
        )?.value || 1
    );


/* =====================================================
   VALIDATION
===================================================== */

if(!itemName){

    showToast(
        "Enter item name"
    );

    return;

}


if(
    !Number.isFinite(
        purchasedQuantity
    ) ||
    purchasedQuantity <= 0
){

    showToast(
        "Enter purchased quantity"
    );

    return;

}


if(
    !Number.isFinite(
        unitPrice
    ) ||
    unitPrice < 0
){

    showToast(
        "Enter valid price"
    );

    return;

}


if(
    !Number.isFinite(
        lowStockThreshold
    ) ||
    lowStockThreshold < 0
){

    showToast(
        "Enter valid low stock threshold"
    );

    return;

}


/* =====================================================
   CHECK IF ITEM ALREADY EXISTS
===================================================== */

const {
    data: existingItems,
    error: searchError
} =
await supabaseClient

    .from(
        "inventory_items"
    )

    .select(`
        id,
        item_name,
        quantity,
        purchased_quantity,
        unit_price,
        low_stock_threshold
    `)

    .eq(
        "user_id",
        userId
    )

    .ilike(
        "item_name",
        itemName
    )

    .limit(1);


if(searchError){

    console.error(
        "Inventory search error:",
        searchError
    );

    showToast(
        searchError.message
    );

    return;

}


/* =====================================================
   EXISTING ITEM
   → ADD NEW PURCHASE BATCH
   → KEEP OLD PRICE
===================================================== */

if(
    existingItems &&
    existingItems.length > 0
){

    const existingItem =
        existingItems[0];


    /* =============================================
       1. UPDATE CURRENT QUANTITY
    ============================================= */

    const newQuantity =
        Number(
            existingItem.quantity || 0
        )
        +
        purchasedQuantity;


    const newPurchasedQuantity =
        Number(
            existingItem.purchased_quantity || 0
        )
        +
        purchasedQuantity;


    const {
        error: updateError
    } =
    await supabaseClient

        .from(
            "inventory_items"
        )

        .update({

            quantity:
                newQuantity,

            purchased_quantity:
                newPurchasedQuantity

        })

        .eq(
            "id",
            existingItem.id
        )

        .eq(
            "user_id",
            userId
        );


    if(updateError){

        console.error(
            "Inventory quantity update error:",
            updateError
        );

        showToast(
            updateError.message
        );

        return;

    }


    /* =============================================
       2. SAVE THE NEW PURCHASE BATCH
    ============================================= */

    const {
        error: purchaseError
    } =
    await supabaseClient

        .from(
            "inventory_purchases"
        )

        .insert({

            user_id:
                userId,

            inventory_item_id:
                existingItem.id,

            purchased_quantity:
                purchasedQuantity,

            unit_price:
                unitPrice

        });


    if(purchaseError){

        console.error(
            "Purchase batch error:",
            purchaseError
        );


        /*
           IMPORTANT:
           The quantity was already updated.
           If inserting the batch fails, we should
           attempt to restore the old quantity.
        */

        await supabaseClient

            .from(
                "inventory_items"
            )

            .update({

                quantity:
                    Number(
                        existingItem.quantity || 0
                    ),

                purchased_quantity:
                    Number(
                        existingItem.purchased_quantity || 0
                    )

            })

            .eq(
                "id",
                existingItem.id
            )

            .eq(
                "user_id",
                userId
            );


        showToast(
            purchaseError.message
        );

        return;

    }


    showToast(
        "New purchase batch added"
    );

}


/* =====================================================
   NEW ITEM
   → CREATE ITEM
   → CREATE FIRST PURCHASE BATCH
===================================================== */

else{


    /* =============================================
       1. CREATE INVENTORY ITEM
    ============================================= */

    const {
        data: newItem,
        error: insertError
    } =
    await supabaseClient

        .from(
            "inventory_items"
        )

        .insert({

            user_id:
                userId,

            item_name:
                itemName,

            quantity:
                purchasedQuantity,

            purchased_quantity:
                purchasedQuantity,

            unit_price:
                unitPrice,

            low_stock_threshold:
                lowStockThreshold

        })

        .select(
            "id"
        )
        .single();


    if(insertError){

        console.error(
            "Inventory insert error:",
            insertError
        );

        showToast(
            insertError.message
        );

        return;

    }


    /* =============================================
       2. CREATE FIRST PURCHASE BATCH
    ============================================= */

    const {
        error: purchaseError
    } =
    await supabaseClient

        .from(
            "inventory_purchases"
        )

        .insert({

            user_id:
                userId,

            inventory_item_id:
                newItem.id,

            purchased_quantity:
                purchasedQuantity,

            unit_price:
                unitPrice

        });


    if(purchaseError){

        console.error(
            "First purchase batch error:",
            purchaseError
        );


        /*
           Remove the newly-created inventory item
           if its purchase batch could not be saved.
        */

        await supabaseClient

            .from(
                "inventory_items"
            )

            .delete()

            .eq(
                "id",
                newItem.id
            )

            .eq(
                "user_id",
                userId
            );


        showToast(
            purchaseError.message
        );

        return;

    }


    showToast(
        "Inventory item added"
    );

}


/* =====================================================
   RESET FORM
===================================================== */

const itemNameInput =
    document.getElementById(
        "itemName"
    );


const purchasedQuantityInput =
    document.getElementById(
        "purchasedQuantity"
    );


const unitPriceInput =
    document.getElementById(
        "unitPrice"
    );


if(itemNameInput){

    itemNameInput.value = "";

}


if(purchasedQuantityInput){

    purchasedQuantityInput.value = "";

}


if(unitPriceInput){

    unitPriceInput.value = "";

}


const thresholdInput =
    document.getElementById(
        "lowStockThreshold"
    );


if(thresholdInput){

    thresholdInput.value = "1";

}


closeAddItemModal();


/* =====================================================
   REFRESH INVENTORY
===================================================== */

await loadInventory();


}





/* =========================================================
   9. SERVICE USAGE
========================================================= */

async function openUsageModal(itemId){

    document.getElementById(
        "usageItemId"
    ).value = itemId;

    const item =
        allInventoryItems.find(
            x => Number(x.id) === Number(itemId)
        );

    const itemName =
        document.getElementById(
            "usageItemName"
        );

    if(itemName){

        itemName.textContent =
            item?.item_name || "";

    }

    document.getElementById(
        "usageModal"
    ).style.display = "flex";

    await loadStorageServices();

    await loadExistingServiceUsage(itemId);
}

async function loadExistingServiceUsage(itemId){

    const userId =
        await getUserId();

    if(!userId) return;


    const {
        data,
        error
    } =
    await supabaseClient

        .from("inventory_service_usage")

        .select(`
            clinic_service_id,
            consumption_quantity
        `)

        .eq(
            "user_id",
            userId
        )

        .eq(
            "inventory_item_id",
            itemId
        );


    if(error){

        console.error(
            "Existing usage error:",
            error
        );

        return;

    }


    (data || []).forEach(row => {


const checkbox =
    document.querySelector(
        `.storage-service-checkbox[value="${row.clinic_service_id}"]`
    );


const wrapper =
    document.getElementById(
        `consumption-wrapper-${row.clinic_service_id}`
    );


const input =
    document.getElementById(
        `consumption-${row.clinic_service_id}`
    );


if(
    !checkbox ||
    !wrapper ||
    !input
){

    return;

}


checkbox.checked = true;


wrapper.style.display =
    "block";


input.value =
    row.consumption_quantity;


});


}

function closeUsageModal(){

    document.getElementById(
        "usageModal"
    ).style.display =
        "none";

}


async function saveServiceUsage(){

    const userId =
        await getUserId();

    if(!userId) return;


    const itemId =
        Number(
            document.getElementById(
                "usageItemId"
            ).value
        );


    if(!itemId){

        showToast(
            "Invalid inventory item"
        );

        return;

    }


    const selectedServices =
        getSelectedStorageServices();


    if(!selectedServices.length){

        showToast(
            "Select at least one service"
        );

        return;

    }


    /*
       Make sure every selected
       service has a valid consumption rate
    */

    const checkedServices =
        document.querySelectorAll(
            ".storage-service-checkbox:checked"
        );


    for(const checkbox of checkedServices){

        const serviceId =
            Number(
                checkbox.value
            );


        const input =
            document.getElementById(
                `consumption-${serviceId}`
            );


        const consumption =
            Number(
                input?.value || 0
            );


        if(
            consumption <= 0
        ){

            showToast(
                "Enter consumption for every selected service"
            );

            input?.focus();

            return;

        }

    }


    /*
       Convert selected services
       into database rows
    */

    const rows =
        selectedServices.map(service => ({

            user_id:
                userId,

            inventory_item_id:
                itemId,

            clinic_service_id:
                service.service_id,

            consumption_quantity:
                service.consumption_rate

        }));


    /*
       Save / update all links
    */

    const {
        error
    } =
    await supabaseClient

        .from(
            "inventory_service_usage"
        )

        .upsert(
            rows,
            {
                onConflict:
                    "inventory_item_id,clinic_service_id"
            }
        );


    if(error){

        console.error(
            "Save service usage error:",
            error
        );

        showToast(
            error.message
        );

        return;

    }


    showToast(
        "Services linked successfully"
    );


    closeUsageModal();

}


/* =========================================================
   10. DELETE ITEM
========================================================= */

async function deleteInventoryItem(id){

    if(
        !await showConfirm(
            "Delete this inventory item?"
        )
    ){

        return;

    }


    const {
        error
    } =
    await supabaseClient

    .from(
        "inventory_items"
    )

    .delete()

    .eq(
        "id",
        id
    );


    if(error){

        showToast(
            error.message
        );

        return;

    }


    showToast(
        "Item deleted"
    );


    await loadInventory();

}


/* =========================================================
   11. SEARCH
========================================================= */

function filterInventory(){

    const value =
        document.getElementById(
            "storageSearch"
        )?.value
        ?.toLowerCase()
        ?.trim()
        || "";


    const filtered =
        allInventoryItems.filter(
            item =>
                (
                    item.item_name
                    || ""
                )
                .toLowerCase()
                .includes(value)
        );


    renderInventory(
        filtered
    );

}
async function loadStorageServices(){

    const userId = await getUserId();
    if(!userId) return;

    const container = document.getElementById("usageServicesList");
    if(!container) return;

    container.innerHTML = `
        <div class="storage-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            جاري تحميل الخدمات...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from("clinic_services")
        .select(`id, service_name`)
        .eq("user_id", userId)
        .order("service_name");

    if(error){
        console.error("Storage services error:", error);
        container.innerHTML = `<div class="storage-error">فشل تحميل الخدمات</div>`;
        return;
    }

    if(!data || data.length === 0){
        container.innerHTML = `<div class="storage-empty">لا توجد خدمات مضافة بعد</div>`;
        return;
    }

    container.innerHTML = data.map(service => `
        <div class="storage-service-row" id="service-row-${service.id}">
            <label class="storage-service-check">
                <input
                    type="checkbox"
                    class="storage-service-checkbox"
                    value="${service.id}"
                    onchange="toggleStorageService(${service.id})"
                >
                <span>${escapeHtml(service.service_name)}</span>
            </label>

            <div
                class="storage-consumption-wrapper"
                id="consumption-wrapper-${service.id}"
                style="display:none;"
            >
                <label>معدل الاستهلاك</label>
                <div class="storage-consumption-field">
                    <input
                        type="number"
                        step="0.0001"
                        min="0"
                        class="storage-consumption-input"
                        id="consumption-${service.id}"
                        placeholder="وحدة / خدمة / سن"
                    >
                </div>
            </div>
        </div>
    `).join("");
}
function toggleStorageService(serviceId){


const checkbox =
    document.querySelector(
        `.storage-service-checkbox[value="${serviceId}"]`
    );


const wrapper =
    document.getElementById(
        `consumption-wrapper-${serviceId}`
    );


const input =
    document.getElementById(
        `consumption-${serviceId}`
    );


if(
    !checkbox ||
    !wrapper ||
    !input
){

    return;

}


if(checkbox.checked){

    wrapper.style.display =
        "block";

    input.focus();

}else{

    wrapper.style.display =
        "none";

    input.value = "";

}


}



function getSelectedStorageServices() {

    const selected = [];

    document
        .querySelectorAll(
            ".storage-service-checkbox:checked"
        )
        .forEach(checkbox => {

            const serviceId =
                Number(
                    checkbox.value
                );

            const input =
                document.getElementById(
                    `consumption-${serviceId}`
                );

            const consumption =
                Number(
                    input?.value || 0
                );

            if (
                !consumption ||
                consumption <= 0
            ) {

                return;

            }

            selected.push({

                service_id:
                    serviceId,

                consumption_rate:
                    consumption

            });

        });

    return selected;
}

/* =========================================================
   12. HTML ESCAPE
========================================================= */

function escapeHtml(value){

    return String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


/* =========================================================
   13. INIT
========================================================= */

async function initStorage(){

    const {
        data
    } =
    await supabaseClient
    .auth
    .getSession();


    if(!data.session){

        window.location.replace(
            "login.html"
        );

        return;

    }


    await initUser();

  

    await loadInventory();
await loadInventoryItemNames();
}


document.addEventListener(
    "DOMContentLoaded",
    initStorage
);