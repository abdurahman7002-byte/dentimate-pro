/* =========================================================
   PATIENT RECORDS — COMPLETE FILE
   Dentix Pro — Upload, View, Download, CBCT, 3D, HTML
========================================================= */

/* =========================
   UPLOAD FILE SYSTEM
========================= */
async function uploadFile(inputId, type) {
    if (!window.currentVisitId) {
        alert("Please select or create a visit first");
        return;
    }
    const input = document.getElementById(inputId);
    if (!input) {
        console.error("Input not found:", inputId);
        return;
    }
    const files = Array.from(input.files || []);
    if (files.length === 0) {
        alert("Choose file(s) first");
        return;
    }
    let uploadedCount = 0;
    let failedCount = 0;
    for (const file of files) {
        try {
            const imageUrl = await uploadToCloudinary(file);
            const { error: dbError } = await supabaseClient
                .from("patient_images")
                .insert([{
                    patient_id: patientId,
                    visit_id: window.currentVisitId,
                    image_url: imageUrl,
                    image_type: type
                }]);
            if (dbError) {
                console.error("Database error:", dbError);
                failedCount++;
                continue;
            }
            uploadedCount++;
        } catch (err) {
            console.error("Upload failed:", file.name, err);
            failedCount++;
        }
    }
    input.value = "";
    if (uploadedCount > 0 && failedCount === 0) {
        showToast(`${uploadedCount} image(s) uploaded successfully ✅`);
    } else if (uploadedCount > 0 && failedCount > 0) {
        showToast(`${uploadedCount} uploaded, ${failedCount} failed ⚠️`);
    } else {
        alert("Failed to upload images");
    }
    await loadImages();
}

function uploadClinicalImage() { uploadFile("clinicalImage", "clinical"); }
function uploadXray() { uploadFile("xrayImage", "xray"); }

/* =========================
   LOAD IMAGES
========================= */
async function loadImages() {
    const container = document.getElementById("imagesContainer");
    const afterContainer = document.getElementById("afterImagesContainer");
    const filesContainer = document.getElementById("medicalFilesContainer");

    if (!container || !afterContainer || !filesContainer) {
        console.log("Images containers not found");
        return;
    }

    if (!window.currentVisitId) {
        container.innerHTML = `
            <div class="no-images">
                <i class="fa-solid fa-calendar-check"></i>
                <br><br>
                Select a visit first
            </div>
        `;
        afterContainer.innerHTML = "";
        filesContainer.innerHTML = "";
        return;
    }

    const { data, error } = await supabaseClient
        .from("patient_images")
        .select("*")
        .eq("patient_id", patientId)
        .eq("visit_id", window.currentVisitId)
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    container.innerHTML = "";
    afterContainer.innerHTML = "";
    filesContainer.innerHTML = "";

    let beforeCount = 0;
    let afterCount = 0;
    let filesCount = 0;

    /* =========================
       FOLDER GROUPING
    ========================= */
    const folderGroups = {};
    data.forEach(img => {
        if (img.folder_id && img.folder_name) {
            if (!folderGroups[img.folder_id]) {
                folderGroups[img.folder_id] = { name: img.folder_name, files: [] };
            }
            folderGroups[img.folder_id].files.push(img);
        }
    });

    /* =========================
       DISPLAY FOLDERS
    ========================= */
    Object.keys(folderGroups).forEach(folderId => {
        const folder = folderGroups[folderId];
        filesCount++;

        const filesListHtml = folder.files.map(file => {
            const fName = file.image_url.split('/').pop();
            const viewFn = file.image_type === 'html'
                ? `openHtmlViewer('${file.image_url}', '${fName}')`
                : `openFileViewer('${file.image_url}', '${file.image_type}', '${fName}')`;
            return `
            <div class="folder-file-row">
                <i class="fa-solid fa-file-medical"></i>
                <span class="file-name">${fName.substring(0, 35)}${fName.length > 35 ? '...' : ''}</span>
                <div class="file-actions">
                    <button onclick="${viewFn}" title="View">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="downloadFile('${file.image_url}', '${fName}')" title="Download">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button onclick="deleteImage(${file.id})" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        filesContainer.innerHTML += `
        <div class="folder-card" id="folder-${folderId}">
            <div class="folder-header" onclick="toggleFolder('${folderId}')">
                <div class="folder-left">
                    <i class="fa-solid fa-folder"></i>
                    <span class="folder-title">${folder.name}</span>
                    <span class="folder-badge">${folder.files.length} file(s)</span>
                </div>
                <div class="folder-right">
                    <button class="folder-download-btn" 
                        onclick="event.stopPropagation(); openCBCTViewer('${folderId}')" 
                        title="View CBCT Slices"
                        style="background: linear-gradient(135deg, #00b4d8, #48cae4); margin-right: 6px;">
                        <i class="fa-solid fa-x-ray"></i>
                    </button>
                    <button class="folder-download-btn" 
                        onclick="event.stopPropagation(); downloadFolder('${folderId}')" 
                        title="Download Folder as ZIP">
                        <i class="fa-solid fa-file-zipper"></i>
                    </button>
                    <button class="delete-folder-btn" 
                        onclick="event.stopPropagation(); deleteFolder('${folderId}')" 
                        title="Delete Folder">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    <i class="fa-solid fa-chevron-down folder-arrow"></i>
                </div>
            </div>
            <div class="folder-body" id="folder-body-${folderId}" style="display:none;">
                ${filesListHtml}
            </div>
        </div>`;
    });

    /* LOOP */
    data.forEach(img => {
        const targetContainer =
            img.image_type === "clinical_after" || img.image_type === "xray_after"
                ? afterContainer
                : container;

        /* =========================
           MEDICAL FILES
        ========================= */
        if (
            img.image_type === "dicom" ||
            img.image_type === "obj" ||
            img.image_type === "ply" ||
            img.image_type === "pdf" ||
            img.image_type === "html" ||
            img.image_type === "stl"
        ) {
            if (img.folder_id) return;
            filesCount++;
            const fileName = img.image_url.split('/').pop();
            const iconClass =
                img.image_type === 'pdf' ? 'fa-file-pdf' :
                img.image_type === 'html' ? 'fa-code' :
                img.image_type === 'stl' ? 'fa-cubes' :
                img.image_type === 'obj' ? 'fa-cube' :
                img.image_type === 'ply' ? 'fa-shapes' :
                'fa-file-medical';

            const viewOnclick = img.image_type === 'html'
                ? `openHtmlViewer('${img.image_url}', '${fileName}')`
                : `openFileViewer('${img.image_url}', '${img.image_type}', '${fileName}')`;

            filesContainer.innerHTML += `
            <div class="file-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div class="file-icon-wrap">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <button class="delete-image-btn" onclick="deleteImage(${img.id})" 
                        style="position:relative;top:0;right:0;width:32px;height:32px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="file-meta">
                    <div class="file-type-label">${img.image_type.toUpperCase()}</div>
                    <div class="file-date">
                        <i class="fa-solid fa-clock"></i>
                        ${new Date(img.created_at).toLocaleString('en-GB', {
                            timeZone: 'Africa/Cairo',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                    </div>
                </div>
                <div class="file-actions-row">
                    <button class="file-btn btn-view" onclick="${viewOnclick}">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="file-btn btn-download" onclick="downloadFile('${img.image_url}', '${fileName}')">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                </div>
            </div>`;
        }

        /* =========================
           NORMAL IMAGES
        ========================= */
        else {
            if (img.image_type === "clinical_after" || img.image_type === "xray_after") {
                afterCount++;
            } else {
                beforeCount++;
            }
            targetContainer.innerHTML += `
            <div class="image-box">
                <img src="${img.image_url}" onclick="openImageViewer('${img.image_url}')" style="cursor:zoom-in;">
                <div class="image-type">
                    ${
                        img.image_type === "clinical" ? "Clinical Before" :
                        img.image_type === "xray" ? "X-Ray Before" :
                        img.image_type === "clinical_after" ? "Clinical After" :
                        img.image_type === "xray_after" ? "X-Ray After" :
                        img.image_type
                    }
                </div>
                <div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);color:white;padding:6px 10px;border-radius:10px;font-size:12px;font-weight:600;">
                    <i class="fa-solid fa-clock"></i>
                    ${new Date(img.created_at).toLocaleString('en-GB', {
                        timeZone: 'Africa/Cairo',
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                </div>
                <button class="delete-image-btn" onclick="deleteImage(${img.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;
        }
    });

    /* EMPTY STATES */
    if (beforeCount === 0) {
        container.innerHTML = `
        <div class="no-images">
            <i class="fa-solid fa-image"></i>
            <br><br>
            No Images
        </div>`;
    }
    if (afterCount === 0) {
        afterContainer.innerHTML = `
        <div class="no-images">
            <i class="fa-solid fa-image"></i>
            <br><br>
            No After Images
        </div>`;
    }
    if (filesCount === 0) {
        filesContainer.innerHTML = `
        <div class="no-images">
            <i class="fa-solid fa-folder-open"></i>
            <br><br>
            No Files
        </div>`;
    }
}

/* =========================
   DELETE IMAGE
========================= */
async function deleteImage(id) {
    if (!await showConfirm("Delete this image?")) return;
    const { error } = await supabaseClient
        .from("patient_images")
        .delete()
        .eq("id", id);
    if (error) {
        alert(error.message);
        return;
    }
    showToast("Deleted successfully");
    loadImages();
}

/* =========================
   DELETE FOLDER
========================= */
async function deleteFolder(folderId) {
    if (!await showConfirm("Delete this folder and all its files?")) return;
    const { error } = await supabaseClient
        .from("patient_images")
        .delete()
        .eq("folder_id", folderId);
    if (error) {
        alert(error.message);
        return;
    }
    showToast("Folder deleted successfully");
    loadImages();
}

/* =========================
   TOGGLE FOLDER
========================= */
function toggleFolder(folderId) {
    const body = document.getElementById('folder-body-' + folderId);
    const card = document.getElementById('folder-' + folderId);
    const isOpen = body.style.display === 'block';
    if (isOpen) {
        body.style.display = 'none';
        card.classList.remove('open');
    } else {
        body.style.display = 'block';
        card.classList.add('open');
    }
}

/* =========================
   DOWNLOAD FOLDER AS ZIP
========================= */
async function downloadFolder(folderId) {
    const btn = document.querySelector(`#folder-${folderId} .folder-download-btn[title="Download Folder as ZIP"]`);
    if (!btn) return;

    const originalIcon = btn.innerHTML;
    btn.classList.add('downloading');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    showToast('Preparing ZIP... ⏳');

    try {
        const { data: files, error } = await supabaseClient
            .from('patient_images')
            .select('*')
            .eq('folder_id', folderId);

        if (error) throw error;
        if (!files || files.length === 0) {
            showToast('No files found in folder ⚠️');
            return;
        }

        const zip = new JSZip();
        const folderName = files[0].folder_name || 'DICOM_Folder';
        const zipFolder = zip.folder(folderName);

        let completed = 0;
        const total = files.length;

        const fetchPromises = files.map(async (file, index) => {
            try {
                const response = await fetch(file.image_url);
                if (!response.ok) throw new Error('Failed: ' + file.image_url);
                const blob = await response.blob();
                const fileName = file.image_url.split('/').pop() || `file_${index + 1}.dcm`;
                zipFolder.file(fileName, blob);
                completed++;
                if (completed % 5 === 0 || completed === total) {
                    showToast(`Zipping... ${completed}/${total} files 📦`);
                }
            } catch (err) {
                console.warn('Skip file:', file.image_url, err.message);
            }
        });

        await Promise.all(fetchPromises);

        showToast('Generating ZIP file... 🗜️');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const zipFileName = `${folderName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.zip`;

        if (typeof saveAs !== 'undefined') {
            saveAs(zipBlob, zipFileName);
        } else {
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        showToast(`✅ "${zipFileName}" downloaded!`);

    } catch (err) {
        console.error('Folder download failed:', err);
        alert('Failed to download folder: ' + err.message);
    } finally {
        btn.classList.remove('downloading');
        btn.innerHTML = originalIcon;
    }
}

/* =========================
   UPLOAD VISIT FILE
========================= */
async function uploadVisitFile(input, fileType) {
    if (!window.currentVisitId) {
        alert("Please select or create a visit first");
        return;
    }
    const file = input.files[0];
    if (!file) return;
    let imageUrl;
    try {
        imageUrl = await uploadToCloudinary(file);
    } catch (err) {
        alert(err.message);
        return;
    }
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user.id;
    const { error } = await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            visit_id: window.currentVisitId,
            image_url: imageUrl,
            image_type: fileType,
            user_id: userId
        }]);
    if (error) {
        alert(error.message);
        return;
    }
    input.value = "";
    showToast(`${fileType.toUpperCase()} Uploaded Successfully ✅`);
    await loadImages();
}

/* =========================
   FILE TYPE UPLOADERS
========================= */
async function uploadDicom(input) { await uploadVisitFile(input, "dicom"); }
async function uploadSTL(input) { await uploadVisitFile(input, "stl"); }
async function uploadOBJ(input) { await uploadVisitFile(input, "obj"); }
async function uploadPLY(input) { await uploadVisitFile(input, "ply"); }
async function uploadPDF(input) { await uploadVisitFile(input, "pdf"); }
async function uploadHTML(input) { await uploadVisitFile(input, "html"); }

/* =========================
   DICOM FOLDER UPLOAD
========================= */
async function uploadDicomFolder(input) {
    if (!window.currentVisitId) {
        alert("Please select or create a visit first");
        input.value = "";
        return;
    }
    const allFiles = Array.from(input.files || []);
    if (allFiles.length === 0) {
        alert("No files selected");
        return;
    }
    const dicomFiles = allFiles.filter(file =>
        file.name.toLowerCase().endsWith('.dcm') ||
        file.name.toLowerCase().endsWith('.dicom')
    );
    if (dicomFiles.length === 0) {
        alert("No DICOM files found in the selected folder");
        input.value = "";
        return;
    }
    const folderName = dicomFiles[0].webkitRelativePath.split('/')[0] || 'DICOM Folder';
    const folderId = 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    let uploadedCount = 0;
    let failedCount = 0;
    for (const file of dicomFiles) {
        try {
            const imageUrl = await uploadToCloudinary(file);
            const { error: dbError } = await supabaseClient
                .from("patient_images")
                .insert([{
                    patient_id: patientId,
                    visit_id: window.currentVisitId,
                    image_url: imageUrl,
                    image_type: "dicom",
                    folder_id: folderId,
                    folder_name: folderName
                }]);
            if (dbError) {
                console.error("Database error:", dbError);
                failedCount++;
                continue;
            }
            uploadedCount++;
        } catch (err) {
            console.error("Upload failed:", file.name, err);
            failedCount++;
        }
    }
    input.value = "";
    if (uploadedCount > 0 && failedCount === 0) {
        showToast(`Folder "${folderName}" uploaded with ${uploadedCount} file(s) ✅`);
    } else if (uploadedCount > 0 && failedCount > 0) {
        showToast(`${uploadedCount} uploaded, ${failedCount} failed ⚠️`);
    } else {
        alert("Failed to upload DICOM folder");
    }
    await loadImages();
}

/* =========================================================
   FILE VIEWER & DOWNLOAD
========================================================= */

function openFileViewer(url, type, fileName) {
    const existing = document.getElementById('fileViewerModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fileViewerModal';
    overlay.className = 'file-viewer-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) closeFileViewer();
    };

    let bodyContent = '';
    const iconMap = {
        pdf: 'fa-file-pdf',
        html: 'fa-code',
        stl: 'fa-cubes',
        obj: 'fa-cube',
        ply: 'fa-shapes',
        dicom: 'fa-file-medical'
    };
    const icon = iconMap[type] || 'fa-file';

    if (type === 'pdf') {
        bodyContent = `<iframe src="${url}" sandbox="allow-scripts allow-same-origin"></iframe>`;
    } else if (type === 'stl' || type === 'obj' || type === 'ply') {
        bodyContent = `
            <div id="viewer3d" style="width:100%;height:100%;"></div>
            <div class="viewer-3d-info">
                <i class="fa-solid fa-hand-pointer"></i>
                Drag to rotate &middot; Scroll to zoom
            </div>
        `;
    } else if (type === 'dicom') {
        bodyContent = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px;">
                <i class="fa-solid fa-x-ray" style="font-size:80px;color:#80ffdb;opacity:0.5;"></i>
                <p style="color:#94a3b8;font-size:16px;">DICOM files open externally for best compatibility</p>
                <a href="${url}" target="_blank" class="file-btn btn-view" style="text-decoration:none;padding:12px 24px;font-size:14px;">
                    <i class="fa-solid fa-external-link-alt"></i> Open in New Tab
                </a>
            </div>
        `;
    } else {
        bodyContent = `<img src="${url}" alt="${fileName}">`;
    }

    overlay.innerHTML = `
        <div class="file-viewer-box">
            <div class="viewer-header">
                <div class="viewer-title">
                    <i class="fa-solid ${icon}"></i>
                    <span>${fileName}</span>
                </div>
                <button class="viewer-close" onclick="closeFileViewer()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="viewer-body">
                ${bodyContent}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    if (type === 'stl' || type === 'obj' || type === 'ply') {
        setTimeout(() => init3DViewer(url, type), 100);
    }
}

function closeFileViewer() {
    const modal = document.getElementById('fileViewerModal');
    if (modal) {
        modal.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }
    if (window._threeRenderer) {
        window._threeRenderer.dispose();
        window._threeRenderer = null;
    }
}

async function downloadFile(url, fileName) {
    try {
        showToast('Downloading... ⏳');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || url.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        showToast('Download complete ✅');
    } catch (err) {
        console.error('Download failed:', err);
        window.open(url, '_blank');
        showToast('Opening in new tab instead ⚠️');
    }
}

/* =========================
   3D VIEWER WITH COLORS
========================= */
function init3DViewer(url, type) {
    const container = document.getElementById('viewer3d');
    if (!container || typeof THREE === 'undefined') {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;gap:15px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:40px;color:#f59e0b;"></i>
                <p>3D viewer library not loaded</p>
                <a href="${url}" target="_blank" class="file-btn btn-view" style="text-decoration:none;">Open Externally</a>
            </div>
        `;
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 80);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    window._threeRenderer = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-10, 0, -10);
    scene.add(fillLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 10, -20);
    scene.add(backLight);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    const gridHelper = new THREE.GridHelper(100, 50, 0x1e293b, 0x0f172a);
    scene.add(gridHelper);

    let loader;
    if (type === 'stl') loader = new THREE.STLLoader();
    else if (type === 'obj') loader = new THREE.OBJLoader();
    else if (type === 'ply') loader = new THREE.PLYLoader();

    if (loader) {
        loader.load(url, (geometry) => {
            let mesh;

            if (type === 'ply') {
                geometry.computeVertexNormals();
                const hasVertexColors = geometry.attributes.color !== undefined;
                const material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : 0xdddddd,
                    vertexColors: hasVertexColors,
                    roughness: 0.4,
                    metalness: 0.1,
                    flatShading: false,
                    side: THREE.DoubleSide
                });
                mesh = new THREE.Mesh(geometry, material);
            }
            else if (type === 'obj') {
                mesh = geometry;
                let hasMaterials = false;
                let hasVertexColors = false;
                mesh.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material &&
                            (child.material.map ||
                             (child.material.color && child.material.color.getHex() !== 0xffffff))) {
                            hasMaterials = true;
                        }
                        if (child.geometry && child.geometry.attributes.color) {
                            hasVertexColors = true;
                        }
                        if (!hasMaterials && !hasVertexColors) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xdddddd,
                                roughness: 0.4,
                                metalness: 0.1,
                                flatShading: false,
                                side: THREE.DoubleSide
                            });
                        } else if (hasVertexColors && child.geometry.attributes.color) {
                            child.material.vertexColors = true;
                            child.material.color.setHex(0xffffff);
                        }
                    }
                });
            }
            else if (type === 'stl') {
                geometry.computeVertexNormals();
                const material = new THREE.MeshStandardMaterial({
                    color: 0xdddddd,
                    roughness: 0.3,
                    metalness: 0.2,
                    flatShading: false,
                    side: THREE.DoubleSide
                });
                mesh = new THREE.Mesh(geometry, material);
            }

            if (mesh) {
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 50 / maxDim;
                mesh.scale.set(scale, scale, scale);
                mesh.position.sub(center.multiplyScalar(scale));
                mesh.position.y += 5;
                scene.add(mesh);

                const infoEl = document.querySelector('.viewer-3d-info');
                if (infoEl) {
                    const colorInfo = type === 'ply' && geometry.attributes.color ? ' | Original Colors' : '';
                    infoEl.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> Drag to rotate · Scroll to zoom${colorInfo}`;
                }
            }
        },
        (xhr) => {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            const infoEl = document.querySelector('.viewer-3d-info');
            if (infoEl && percent < 100) {
                infoEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading ${percent}%`;
            }
        },
        (err) => {
            console.error('3D load error:', err);
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;gap:15px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:40px;color:#ef4444;"></i>
                    <p>Failed to load 3D model</p>
                </div>
            `;
        });
    }

    function animate() {
        if (!document.getElementById('viewer3d')) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
        if (!container || !renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    resizeObserver.observe(container);
}

/* =========================================================
   HTML FILE VIEWER — SECURITY FIX
========================================================= */

async function openHtmlViewer(url, fileName) {
    const existing = document.getElementById('htmlViewerModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'htmlViewerModal';
    overlay.className = 'file-viewer-overlay';
    overlay.style.zIndex = '10000';
    overlay.onclick = (e) => {
        if (e.target === overlay) closeHtmlViewer();
    };

    overlay.innerHTML = `
        <div class="file-viewer-box" style="max-width:95vw; width:1200px;">
            <div class="viewer-header">
                <div class="viewer-title">
                    <i class="fa-solid fa-cube" style="color:#f59e0b;"></i>
                    <span>${fileName}</span>
                    <span class="html-badge">3D SCAN</span>
                </div>
                <div style="display:flex;gap:10px;align-items:center;">
                    <button class="html-tab-btn active" data-tab="preview" onclick="switchHtmlTab('preview')">
                        <i class="fa-solid fa-eye"></i> 3D View
                    </button>
                    <button class="html-tab-btn" data-tab="source" onclick="switchHtmlTab('source')">
                        <i class="fa-solid fa-code"></i> Source
                    </button>
                    <button class="html-tab-btn" onclick="openHtmlExternal('${url}')" title="Open in new tab">
                        <i class="fa-solid fa-external-link-alt"></i>
                    </button>
                    <button class="viewer-close" onclick="closeHtmlViewer()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-body" style="position:relative;">
                <div id="html-tab-preview" class="html-tab-content active">
                    <div class="html-preview-bar" id="htmlPreviewBar">
                        <i class="fa-solid fa-spinner fa-spin" style="color:#f59e0b;"></i>
                        <span id="htmlLoadingText">Loading 3D viewer...</span>
                    </div>
                    <div id="htmlFrameContainer" style="width:100%;height:calc(85vh - 140px);background:#0f172a;position:relative;"></div>
                </div>
                <div id="html-tab-source" class="html-tab-content" style="display:none;">
                    <div class="html-source-bar">
                        <i class="fa-solid fa-terminal" style="color:#80ffdb;"></i>
                        <span>Source Code</span>
                        <button class="html-copy-btn" onclick="copyHtmlSource()">
                            <i class="fa-solid fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre id="htmlSourceCode" class="html-source-code"><code class="language-html">Loading source...</code></pre>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    let htmlText = '';
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch HTML');
        htmlText = await response.text();
        const codeEl = document.getElementById('htmlSourceCode');
        if (codeEl) {
            const escaped = htmlText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            codeEl.innerHTML = `<code class="language-html">${escaped}</code>`;
        }
    } catch (err) {
        updateHtmlStatus('error', 'Failed to load HTML: ' + err.message);
        return;
    }

    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    htmlText = htmlText.replace(
        /(src|href)=['"]((?!http|https|data:|#|\/\/)[^'"]+)['"]/gi,
        (match, attr, path) => {
            if (path.startsWith('data:') || path.startsWith('#') || path.startsWith('http') || path.startsWith('//')) return match;
            return `${attr}="${baseUrl}${path}"`;
        }
    );

    const container = document.getElementById('htmlFrameContainer');
    if (!container) return;

    try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0f172a;';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
        iframe.referrerPolicy = 'no-referrer';
        iframe.allow = 'fullscreen';
        iframe.srcdoc = htmlText;
        iframe.onload = () => { updateHtmlStatus('success', '3D viewer loaded — Drag to rotate, scroll to zoom'); };
        iframe.onerror = () => { tryMethod2(url, htmlText, container); };
        container.innerHTML = '';
        container.appendChild(iframe);
    } catch (err) {
        tryMethod2(url, htmlText, container);
    }
}

function tryMethod2(url, htmlText, container) {
    try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0f172a;';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
        iframe.referrerPolicy = 'no-referrer';
        iframe.allow = 'fullscreen';
        iframe.src = url;
        iframe.onload = () => { updateHtmlStatus('success', '3D viewer loaded (direct mode)'); };
        iframe.onerror = () => { tryMethod3(url, container); };
        container.innerHTML = '';
        container.appendChild(iframe);
    } catch (err) {
        tryMethod3(url, container);
    }
}

function tryMethod3(url, container) {
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px;color:#94a3b8;">
            <i class="fa-solid fa-shield-halved" style="font-size:60px;color:#f59e0b;opacity:0.6;"></i>
            <p style="font-size:16px;text-align:center;max-width:400px;">Browser security prevents inline preview of this 3D scan.</p>
            <button onclick="openHtmlExternal('${url}')" class="file-btn btn-view" style="padding:12px 28px;font-size:14px;">
                <i class="fa-solid fa-external-link-alt"></i> Open 3D Viewer in New Tab
            </button>
        </div>
    `;
    updateHtmlStatus('warning', 'Preview blocked — Click "Open in new tab"');
}

function openHtmlExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}

function updateHtmlStatus(type, message) {
    const bar = document.getElementById('htmlPreviewBar');
    if (!bar) return;
    const icons = {
        success: '<i class="fa-solid fa-check-circle" style="color:#22c55e;"></i>',
        error: '<i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i>'
    };
    bar.innerHTML = (icons[type] || '') + ' <span>' + message + '</span>';
}

function switchHtmlTab(tab) {
    document.querySelectorAll('.html-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.html-tab-content').forEach(content => {
        content.style.display = content.id === 'html-tab-' + tab ? 'block' : 'none';
    });
}

async function copyHtmlSource() {
    const codeEl = document.querySelector('#htmlSourceCode code');
    if (!codeEl) return;
    try {
        await navigator.clipboard.writeText(codeEl.textContent);
        showToast('Source copied ✅');
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = codeEl.textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Source copied ✅');
    }
}

function closeHtmlViewer() {
    const modal = document.getElementById('htmlViewerModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }
}

/* =========================================================
   CBCT / DICOM FOLDER VIEWER — CORNERSTONE.JS
   Displays DICOM (.dcm) directly in browser without conversion
   Requires: dicom-parser, cornerstone-core, cornerstone-wado-image-loader
========================================================= */

/* =========================
   OPEN CBCT VIEWER (DICOM NATIVE)
========================= */



/* =========================================================
   CBCT / DICOM FOLDER VIEWER — MPR 3 VIEWS
   Axial · Sagittal · Coronal
   Requires: dicom-parser (mandatory)
   Optional: cornerstone-core + cornerstone-wado-image-loader
========================================================= */
/* =========================================================
   CBCT / DICOM FOLDER VIEWER — TRUE MPR 3 VIEWS
   Axial · Sagittal · Coronal
   Requires: dicom-parser only
========================================================= */

/* =========================
   STATE
========================= */
window._cbctFiles = null;
window._cbctVolume = null;   // { data: Float32Array, width, height, depth }
window._mprState = {
  axial: 0,
  sagittal: 0,
  coronal: 0,
  ww: 2000,
  wl: 500,
  activeViewport: 'axial'
};
window._cbctPlayInterval = null;

/* =========================
   OPEN CBCT VIEWER
========================= */
async function openCBCTViewer(folderId) {
  const existing = document.getElementById('cbctViewerModal');
  if (existing) existing.remove();

  const { data: files, error } = await supabaseClient
    .from('patient_images')
    .select('*')
    .eq('folder_id', folderId)
    .order('id', { ascending: true });

  if (error || !files || files.length === 0) {
    showToast('No files found in folder ⚠️');
    return;
  }

  const folderName = files[0].folder_name || 'CBCT Scan';

  const overlay = document.createElement('div');
  overlay.id = 'cbctViewerModal';
  overlay.className = 'file-viewer-overlay';
  overlay.style.zIndex = '10001';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeCBCTViewer();
  };

  overlay.innerHTML = `
    <div class="file-viewer-box cbct-viewer-box">
      <div class="viewer-header">
        <div class="viewer-title">
          <i class="fa-solid fa-x-ray" style="color:#00b4d8;"></i>
          <span>${folderName}</span>
          <span class="cbct-badge">${files.length} SLICES</span>
          <span class="dcm-native-badge">TRUE MPR</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="html-tab-btn" onclick="downloadFolder('${folderId}')" title="Download ZIP">
            <i class="fa-solid fa-file-zipper"></i> ZIP
          </button>
          <button class="viewer-close" onclick="closeCBCTViewer()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="cbct-main" id="cbctMainGrid">
        <div class="dicom-viewport active" id="viewport-axial" data-axis="axial">
          <div class="viewport-label">Axial</div>
          <div class="viewport-crosshair-h"></div>
          <div class="viewport-crosshair-v"></div>
          <div class="viewport-toolbar">
            <button onclick="zoomViewport('axial', 0.1)" title="Zoom In"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button onclick="zoomViewport('axial', -0.1)" title="Zoom Out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button onclick="resetZoom('axial')" title="Reset Zoom"><i class="fa-solid fa-compress"></i></button>
            <button onclick="toggleViewportFullscreen('axial')" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
          </div>
        </div>
        <div class="dicom-viewport" id="viewport-sagittal" data-axis="sagittal">
          <div class="viewport-label">Sagittal</div>
          <div class="viewport-crosshair-h"></div>
          <div class="viewport-crosshair-v"></div>
          <div class="viewport-toolbar">
            <button onclick="zoomViewport('sagittal', 0.1)" title="Zoom In"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button onclick="zoomViewport('sagittal', -0.1)" title="Zoom Out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button onclick="resetZoom('sagittal')" title="Reset Zoom"><i class="fa-solid fa-compress"></i></button>
            <button onclick="toggleViewportFullscreen('sagittal')" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
          </div>
        </div>
        <div class="dicom-viewport" id="viewport-coronal" data-axis="coronal">
          <div class="viewport-label">Coronal</div>
          <div class="viewport-crosshair-h"></div>
          <div class="viewport-crosshair-v"></div>
          <div class="viewport-toolbar">
            <button onclick="zoomViewport('coronal', 0.1)" title="Zoom In"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button onclick="zoomViewport('coronal', -0.1)" title="Zoom Out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button onclick="resetZoom('coronal')" title="Reset Zoom"><i class="fa-solid fa-compress"></i></button>
            <button onclick="toggleViewportFullscreen('coronal')" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
          </div>
        </div>
        <div class="cbct-thumbnails" id="cbctThumbnails">
          <div class="cbct-thumb-header">
            <i class="fa-solid fa-layer-group"></i>
            <span>Slices</span>
          </div>
          <div class="cbct-thumb-list" id="cbctThumbList">
            ${files.map((file, index) => `
              <div class="cbct-slice-thumb ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="jumpToSlice(${index})">
                <div class="dcm-placeholder"><i class="fa-solid fa-file-medical"></i><span>.DCM</span></div>
                <span class="slice-num">${index + 1}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="cbct-controls">
        <div class="cbct-slider-wrap">
          <button class="cbct-play-btn" id="cbctPlayBtn" onclick="togglePlaySlices()">
            <i class="fa-solid fa-play"></i>
          </button>
          <input type="range" id="cbctSlider" min="0" max="${files.length - 1}" value="0" class="cbct-slider" oninput="jumpToSlice(this.value)">
          <span class="cbct-slider-label" id="cbctSliderLabel">1 / ${files.length}</span>
        </div>
        <div class="cbct-view-controls">
          <button onclick="resetAllViews()" title="Reset All"><i class="fa-solid fa-rotate-left"></i></button>
          <button onclick="toggleFullscreen()" title="Fullscreen All"><i class="fa-solid fa-expand"></i></button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  window._cbctFiles = files;

  /* Init zoom state */
  window._mprZoom = { axial: 1, sagittal: 1, coronal: 1 };
  window._mprPan = { axial: { x: 0, y: 0 }, sagittal: { x: 0, y: 0 }, coronal: { x: 0, y: 0 } };

  document.addEventListener('keydown', handleCBCTKeydown);
  setTimeout(() => initMPRViewer(files), 100);
}
/* =========================
   ZOOM & PAN
========================= */
function zoomViewport(axis, delta) {
  if (!window._mprZoom) return;
  window._mprZoom[axis] = Math.max(0.5, Math.min(5.0, window._mprZoom[axis] + delta));
  redrawViewport(axis);
}

function resetZoom(axis) {
  if (!window._mprZoom || !window._mprPan) return;
  window._mprZoom[axis] = 1;
  window._mprPan[axis] = { x: 0, y: 0 };
  redrawViewport(axis);
}

function redrawViewport(axis) {
  if (!window._cbctVolume) return;
  if (axis === 'axial') drawAxial(window._mprState.axial);
  else if (axis === 'sagittal') drawSagittal(window._mprState.sagittal);
  else if (axis === 'coronal') drawCoronal(window._mprState.coronal);
  updateCrosshairs();
}

/* =========================
   FULLSCREEN SINGLE VIEWPORT
========================= */
function toggleViewportFullscreen(axis) {
  const main = document.getElementById('cbctMainGrid');
  const vp = document.getElementById('viewport-' + axis);
  if (!main || !vp) return;

  /* If already fullscreened, restore grid */
  if (main.classList.contains('fullscreen-mode')) {
    main.classList.remove('fullscreen-mode');
    ['axial', 'sagittal', 'coronal'].forEach(a => {
      const el = document.getElementById('viewport-' + a);
      if (el) el.classList.remove('fullscreen-viewport');
    });
    window._mprState.activeViewport = axis;
    updateSlider();
    return;
  }

  /* Enter fullscreen for this axis */
  main.classList.add('fullscreen-mode');
  ['axial', 'sagittal', 'coronal'].forEach(a => {
    const el = document.getElementById('viewport-' + a);
    if (!el) return;
    if (a === axis) {
      el.classList.add('fullscreen-viewport');
      el.classList.add('active');
    } else {
      el.classList.remove('fullscreen-viewport');
      el.classList.remove('active');
    }
  });

  window._mprState.activeViewport = axis;
  updateSlider();

  /* Redraw after layout change */
  setTimeout(() => redrawViewport(axis), 50);
}
/* =========================
   INIT MPR VIEWER
========================= */
async function initMPRViewer(files) {
  /* Ensure dicom-parser is loaded */
  if (typeof dicomParser === 'undefined') {
    try {
      await loadScript([
        'js/dicomParser.min.js',
        'https://cdn.jsdelivr.net/npm/dicom-parser@1.8.21/dist/dicomParser.min.js',
        'https://unpkg.com/dicom-parser@1.8.21/dist/dicomParser.min.js'
      ]);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error('dicom-parser load failed:', err);
    }
  }

  if (typeof dicomParser === 'undefined') {
    showDicomError('dicom-parser not available. Check your network.');
    return;
  }

  showToast('Building 3D volume... ⏳');

  try {
    await loadDicomVolume(files);
    setupViewportEvents();
    renderAllViews();
    showToast('CBCT MPR ready ✅');
  } catch (err) {
    console.error('MPR init error:', err);
    showDicomError('Failed to build volume: ' + err.message);
  }
}

/* =========================
   LOAD & BUILD 3D VOLUME
========================= */
async function loadDicomVolume(files) {
  const slices = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const response = await fetch(file.image_url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const arrayBuffer = await response.arrayBuffer();

      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const rows = dataSet.uint16('x00280010');
      const cols = dataSet.uint16('x00280011');
      const bitsAllocated = dataSet.uint16('x00280100') || 16;
      const pixelRepresentation = dataSet.uint16('x00280103') || 0;
      const photometric = dataSet.string('x00280004') || 'MONOCHROME2';
      const slope = dataSet.floatString('x00281053') || 1;
      const intercept = dataSet.floatString('x00281052') || 0;

      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement || !rows || !cols) {
        throw new Error('Missing pixel data in file ' + (i + 1));
      }

      let pixelData;
      if (bitsAllocated === 16) {
        pixelData = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);
      } else {
        pixelData = new Uint8Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);
      }

      const floatData = new Float32Array(rows * cols);
      for (let p = 0; p < rows * cols; p++) {
        let val = pixelData[p];
        if (pixelRepresentation === 1 && bitsAllocated === 16 && val > 32767) val -= 65536;
        val = val * slope + intercept;
        floatData[p] = val;
      }

      const positionStr = dataSet.string('x00200032') || '0\\0\\' + i;
      const posParts = positionStr.split('\\').map(Number);
      const zPos = posParts[2] || i;

      slices.push({
        index: i,
        rows,
        cols,
        data: floatData,
        photometric,
        zPos
      });
    } catch (err) {
      console.warn('Failed to parse slice', i, err.message);
    }
  }

  if (slices.length === 0) throw new Error('No valid DICOM slices found');

  /* Sort by Z position (or original index as fallback) */
  slices.sort((a, b) => a.zPos - b.zPos);

  const depth = slices.length;
  const height = slices[0].rows;
  const width = slices[0].cols;

  /* Build single 3D volume array: [z][y][x] */
  const volume = new Float32Array(depth * height * width);
  for (let z = 0; z < depth; z++) {
    volume.set(slices[z].data, z * height * width);
  }

  /* Compute auto window/level */
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < volume.length; i++) {
    if (volume[i] < min) min = volume[i];
    if (volume[i] > max) max = volume[i];
  }

  window._cbctVolume = { data: volume, width, height, depth, slices };
  window._mprState = {
    axial: Math.floor(depth / 2),
    sagittal: Math.floor(width / 2),
    coronal: Math.floor(height / 2),
    ww: Math.max(1, max - min),
    wl: (max + min) / 2,
    activeViewport: 'axial'
  };
}

/* =========================
   RENDER ALL VIEWS
========================= */
function renderAllViews() {
  if (!window._cbctVolume) return;
  drawAxial(window._mprState.axial);
  drawSagittal(window._mprState.sagittal);
  drawCoronal(window._mprState.coronal);
  updateSlider(window._mprState.axial);
  updateCrosshairs();
}

/* =========================
   DRAW AXIAL (Z slice) — WITH ZOOM/PAN
========================= */
function drawAxial(sliceIndex) {
  const vol = window._cbctVolume;
  const viewport = document.getElementById('viewport-axial');
  if (!viewport || !vol) return;
  sliceIndex = Math.max(0, Math.min(sliceIndex, vol.depth - 1));

  const canvas = getOrCreateCanvas(viewport, vol.width, vol.height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(vol.width, vol.height);

  fillImageData(imgData, (x, y) => {
    return vol.data[sliceIndex * vol.height * vol.width + y * vol.width + x];
  }, vol.slices[sliceIndex].photometric);

  ctx.putImageData(imgData, 0, 0);
  applyViewportTransform(viewport, canvas, 'axial');
}

/* =========================
   DRAW SAGITTAL (X slice) — WITH ZOOM/PAN
========================= */
/* =========================
   DRAW SAGITTAL (X slice) — ROTATED 90° CCW
========================= */
function drawSagittal(colIndex) {
  const vol = window._cbctVolume;
  const viewport = document.getElementById('viewport-sagittal');
  if (!viewport || !vol) return;
  colIndex = Math.max(0, Math.min(colIndex, vol.width - 1));

  /* 1. Canvas مؤقت للبيانات الأصلية (depth × height) */
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = vol.depth;
  tempCanvas.height = vol.height;
  const tempCtx = tempCanvas.getContext('2d');
  const imgData = tempCtx.createImageData(vol.depth, vol.height);

  fillImageData(imgData, (z, y) => {
    return vol.data[z * vol.height * vol.width + y * vol.width + colIndex];
  }, vol.slices[0].photometric);

  tempCtx.putImageData(imgData, 0, 0);

  /* 2. Canvas الظاهر (height × depth) بعد التدوير */
  const canvas = getOrCreateCanvas(viewport, vol.height, vol.depth);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2); /* 90° CCW */
  ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
  ctx.restore();

  applyViewportTransform(viewport, canvas, 'sagittal');
}
/* =========================
   DRAW CORONAL (Y slice) — WITH ZOOM/PAN
========================= */
/* =========================
   DRAW CORONAL (Y slice) — ROTATED 180°
========================= */
function drawCoronal(rowIndex) {
  const vol = window._cbctVolume;
  const viewport = document.getElementById('viewport-coronal');
  if (!viewport || !vol) return;
  rowIndex = Math.max(0, Math.min(rowIndex, vol.height - 1));

  /* 1. Canvas مؤقت بالبيانات الأصلية */
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = vol.width;
  tempCanvas.height = vol.depth;
  const tempCtx = tempCanvas.getContext('2d');
  const imgData = tempCtx.createImageData(vol.width, vol.depth);

  fillImageData(imgData, (x, z) => {
    return vol.data[z * vol.height * vol.width + rowIndex * vol.width + x];
  }, vol.slices[0].photometric);

  tempCtx.putImageData(imgData, 0, 0);

  /* 2. Canvas الظاهر مع تدوير 180° */
  const canvas = getOrCreateCanvas(viewport, vol.width, vol.depth);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI); /* 180° */
  ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
  ctx.restore();

  applyViewportTransform(viewport, canvas, 'coronal');
}

/* =========================
   APPLY ZOOM & PAN TRANSFORM
========================= */
function applyViewportTransform(viewport, canvas, axis) {
  const zoom = window._mprZoom?.[axis] || 1;
  const pan = window._mprPan?.[axis] || { x: 0, y: 0 };

  canvas.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  canvas.style.transformOrigin = 'center center';
}
/* =========================
   FILL IMAGE DATA (W/L)
========================= */
function fillImageData(imgData, getValueFn, photometric) {
  const { ww, wl } = window._mprState;
  const min = wl - ww / 2;
  const range = ww || 1;
  const w = imgData.width;
  const h = imgData.height;
  const isMono1 = photometric === 'MONOCHROME1';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = getValueFn(x, y);
      val = ((val - min) / range) * 255;
      val = Math.max(0, Math.min(255, val));
      if (isMono1) val = 255 - val;

      const idx = (y * w + x) * 4;
      imgData.data[idx] = val;
      imgData.data[idx + 1] = val;
      imgData.data[idx + 2] = val;
      imgData.data[idx + 3] = 255;
    }
  }
}

/* =========================
   CANVAS HELPER
========================= */
function getOrCreateCanvas(viewport, width, height) {
  let canvas = viewport.querySelector('canvas.dicom-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'dicom-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.objectFit = 'contain';
    viewport.appendChild(canvas);
  }
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/* =========================
   VIEWPORT EVENTS
========================= */
/* =========================
   VIEWPORT EVENTS + PAN
========================= */
function setupViewportEvents() {
  ['axial', 'sagittal', 'coronal'].forEach(axis => {
    const el = document.getElementById('viewport-' + axis);
    if (!el) return;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; /* Left click only */

      /* Activate viewport */
      document.querySelectorAll('.dicom-viewport').forEach(v => v.classList.remove('active'));
      el.classList.add('active');
      window._mprState.activeViewport = axis;
      updateSlider();

      /* Start Pan */
      window._isPanning = true;
      window._panAxis = axis;
      window._panStart = { x: e.clientX, y: e.clientY };
      window._panStartOffset = { ...window._mprPan[axis] };
      el.style.cursor = 'grabbing';
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      scrollViewport(axis, dir);
    }, { passive: false });
  });

  /* Global mouse move/up for smooth panning */
  window.addEventListener('mousemove', (e) => {
    if (!window._isPanning || !window._panAxis) return;
    const axis = window._panAxis;
    const dx = e.clientX - window._panStart.x;
    const dy = e.clientY - window._panStart.y;
    window._mprPan[axis].x = window._panStartOffset.x + dx;
    window._mprPan[axis].y = window._panStartOffset.y + dy;
    redrawViewport(axis);
  });

  window.addEventListener('mouseup', () => {
    if (window._isPanning) {
      window._isPanning = false;
      window._panAxis = null;
      document.querySelectorAll('.dicom-viewport').forEach(v => v.style.cursor = '');
    }
  });
}
function scrollViewport(axis, dir) {
  const vol = window._cbctVolume;
  if (!vol) return;

  if (axis === 'axial') {
    window._mprState.axial = Math.max(0, Math.min(window._mprState.axial + dir, vol.depth - 1));
    drawAxial(window._mprState.axial);
    highlightThumb(window._mprState.axial);
  } else if (axis === 'sagittal') {
    window._mprState.sagittal = Math.max(0, Math.min(window._mprState.sagittal + dir, vol.width - 1));
    drawSagittal(window._mprState.sagittal);
  } else if (axis === 'coronal') {
    window._mprState.coronal = Math.max(0, Math.min(window._mprState.coronal + dir, vol.height - 1));
    drawCoronal(window._mprState.coronal);
  }

  /* إذا كان المحور المحرك هو النشط، حدّث السلايدر */
  if (axis === window._mprState.activeViewport) {
    updateSlider();
  }
  updateCrosshairs();
}

/* =========================
   CROSSHAIRS (Sync lines)
========================= */
/* =========================
   CROSSHAIRS — FIXED FOR 180° CORONAL
========================= */
function updateCrosshairs() {
  const vol = window._cbctVolume;
  if (!vol) return;

  /* Axial: طبيعي */
  setCrosshair('viewport-axial',
    window._mprState.sagittal / vol.width,
    window._mprState.coronal / vol.height
  );

  /* Sagittal: مُدار 90° عكس عقارب الساعة */
  setCrosshair('viewport-sagittal',
    window._mprState.coronal / vol.height,
    1 - (window._mprState.axial / vol.depth)
  );

  /* Coronal: مُدار 180° ← نعكس X و Y */
  setCrosshair('viewport-coronal',
    1 - (window._mprState.sagittal / vol.width),
    1 - (window._mprState.axial / vol.depth)
  );
}
function setCrosshair(viewportId, xRatio, yRatio) {
  const vp = document.getElementById(viewportId);
  if (!vp) return;
  const h = vp.querySelector('.viewport-crosshair-h');
  const v = vp.querySelector('.viewport-crosshair-v');
  if (h) h.style.top = (yRatio * 100) + '%';
  if (v) v.style.left = (xRatio * 100) + '%';
}

/* =========================
   UI HELPERS
========================= */
/* =========================
   UI HELPERS — FIXED FOR ACTIVE VIEWPORT
========================= */

function updateSlider() {
  const slider = document.getElementById('cbctSlider');
  const label = document.getElementById('cbctSliderLabel');
  if (!slider || !window._cbctVolume) return;

  const axis = window._mprState.activeViewport;
  let val, max, text;

  if (axis === 'axial') {
    val = window._mprState.axial;
    max = window._cbctVolume.depth - 1;
    text = (val + 1) + ' / ' + window._cbctVolume.depth;
  } else if (axis === 'sagittal') {
    val = window._mprState.sagittal;
    max = window._cbctVolume.width - 1;
    text = (val + 1) + ' / ' + window._cbctVolume.width;
  } else if (axis === 'coronal') {
    val = window._mprState.coronal;
    max = window._cbctVolume.height - 1;
    text = (val + 1) + ' / ' + window._cbctVolume.height;
  }

  slider.max = max;
  slider.value = val;
  if (label) label.textContent = text;
}

function highlightThumb(index) {
  document.querySelectorAll('.cbct-slice-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === index);
    if (i === index) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function jumpToSlice(index) {
  if (!window._cbctVolume) return;
  index = parseInt(index);
  const axis = window._mprState.activeViewport;

  if (axis === 'axial') {
    window._mprState.axial = Math.max(0, Math.min(index, window._cbctVolume.depth - 1));
    drawAxial(window._mprState.axial);
    highlightThumb(window._mprState.axial);
  } else if (axis === 'sagittal') {
    window._mprState.sagittal = Math.max(0, Math.min(index, window._cbctVolume.width - 1));
    drawSagittal(window._mprState.sagittal);
  } else if (axis === 'coronal') {
    window._mprState.coronal = Math.max(0, Math.min(index, window._cbctVolume.height - 1));
    drawCoronal(window._mprState.coronal);
  }

  updateSlider();
  updateCrosshairs();
}

function nextSlice() {
  if (!window._cbctVolume) return;
  const axis = window._mprState.activeViewport;

  if (axis === 'axial') {
    window._mprState.axial = (window._mprState.axial + 1) % window._cbctVolume.depth;
    drawAxial(window._mprState.axial);
    highlightThumb(window._mprState.axial);
  } else if (axis === 'sagittal') {
    window._mprState.sagittal = (window._mprState.sagittal + 1) % window._cbctVolume.width;
    drawSagittal(window._mprState.sagittal);
  } else if (axis === 'coronal') {
    window._mprState.coronal = (window._mprState.coronal + 1) % window._cbctVolume.height;
    drawCoronal(window._mprState.coronal);
  }

  updateSlider();
  updateCrosshairs();
}

function prevSlice() {
  if (!window._cbctVolume) return;
  const axis = window._mprState.activeViewport;

  if (axis === 'axial') {
    window._mprState.axial = (window._mprState.axial - 1 + window._cbctVolume.depth) % window._cbctVolume.depth;
    drawAxial(window._mprState.axial);
    highlightThumb(window._mprState.axial);
  } else if (axis === 'sagittal') {
    window._mprState.sagittal = (window._mprState.sagittal - 1 + window._cbctVolume.width) % window._cbctVolume.width;
    drawSagittal(window._mprState.sagittal);
  } else if (axis === 'coronal') {
    window._mprState.coronal = (window._mprState.coronal - 1 + window._cbctVolume.height) % window._cbctVolume.height;
    drawCoronal(window._mprState.coronal);
  }

  updateSlider();
  updateCrosshairs();
}

function togglePlaySlices() {
  const btn = document.getElementById('cbctPlayBtn');
  if (!btn) return;
  if (window._cbctPlayInterval) {
    clearInterval(window._cbctPlayInterval);
    window._cbctPlayInterval = null;
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    btn.classList.remove('playing');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    btn.classList.add('playing');
    window._cbctPlayInterval = setInterval(nextSlice, 150);
  }
}

function resetAllViews() {
  if (!window._cbctVolume) return;
  const vol = window._cbctVolume;
  window._mprState.axial = Math.floor(vol.depth / 2);
  window._mprState.sagittal = Math.floor(vol.width / 2);
  window._mprState.coronal = Math.floor(vol.height / 2);
  renderAllViews();
  updateSlider();
  highlightThumb(window._mprState.axial);
}

function toggleFullscreen() {
  const box = document.querySelector('.cbct-viewer-box');
  if (!box) return;
  if (!document.fullscreenElement) {
    if (box.requestFullscreen) box.requestFullscreen();
    else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function handleCBCTKeydown(e) {
  if (!document.getElementById('cbctViewerModal')) return;
  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': e.preventDefault(); nextSlice(); break;
    case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); prevSlice(); break;
    case 'Escape': closeCBCTViewer(); break;
    case ' ': e.preventDefault(); togglePlaySlices(); break;
  }
}

function showDicomError(msg) {
  ['viewport-axial', 'viewport-sagittal', 'viewport-coronal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="viewport-label">${id.split('-')[1].toUpperCase()}</div>
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;gap:15px;padding:30px;text-align:center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:36px;color:#ef4444;"></i>
          <p style="font-size:14px;">${msg}</p>
        </div>`;
    }
  });
}

/* =========================
   CLOSE CBCT VIEWER
========================= */
function closeCBCTViewer() {
  if (window._cbctPlayInterval) {
    clearInterval(window._cbctPlayInterval);
    window._cbctPlayInterval = null;
  }
  document.removeEventListener('keydown', handleCBCTKeydown);

  /* Clean pan state */
  window._isPanning = false;
  window._panAxis = null;

  window._cbctFiles = null;
  window._cbctVolume = null;

  const modal = document.getElementById('cbctViewerModal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 200);
  }
}
/* =========================
   SCRIPT LOADER HELPER
========================= */
function loadScript(srcs) {
  if (!Array.isArray(srcs)) srcs = [srcs];
  return new Promise((resolve, reject) => {
    for (const src of srcs) {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    }
    let attempt = 0;
    function tryNext() {
      if (attempt >= srcs.length) {
        reject(new Error('All sources failed'));
        return;
      }
      const src = srcs[attempt++];
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = tryNext;
      document.head.appendChild(s);
    }
    tryNext();
  });
}
