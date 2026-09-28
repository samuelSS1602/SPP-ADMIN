async function startBookingCamera() {
    const video = document.getElementById('bookingCameraPreview');
    const placeholder = document.getElementById('bookingCameraPlaceholder');
    const startBtn = document.getElementById('startBookingCameraBtn');
    const stopBtn = document.getElementById('stopBookingCameraBtn');

    if (!video || !placeholder || !startBtn || !stopBtn) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Webcam is not supported in this browser');
        return;
    }

    try {
        if (bookingCameraStream) {
            stopBookingCameraStream();
        }

        bookingCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = bookingCameraStream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
    } catch (error) {
        alert('Unable to access webcam. Please allow camera permission and try again.');
    }
}

function stopBookingCameraStream() {
    if (bookingCameraStream) {
        bookingCameraStream.getTracks().forEach(track => track.stop());
        bookingCameraStream = null;
    }

    const video = document.getElementById('bookingCameraPreview');
    const placeholder = document.getElementById('bookingCameraPlaceholder');
    const startBtn = document.getElementById('startBookingCameraBtn');
    const stopBtn = document.getElementById('stopBookingCameraBtn');

    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
}

function captureBookingPhoto(captureType) {
    const video = document.getElementById('bookingCameraPreview');

    if (!bookingCameraStream || !video || video.style.display === 'none' || video.videoWidth === 0) {
        alert('Please start camera first');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.92);

    if (captureType === 'customer') {
        const input = document.getElementById('bookingCustomerPhotoData');
        const previewImg = document.getElementById('customerPhotoPreview');
        const emptyText = document.getElementById('customerPhotoEmpty');

        if (input) input.value = imageData;
        if (previewImg) {
            previewImg.src = imageData;
            previewImg.style.display = 'block';
        }
        if (emptyText) emptyText.style.display = 'none';
        alert('Customer photo captured successfully');
        return;
    }

    const input = document.getElementById('bookingIdProofPhotoData');
    const previewImg = document.getElementById('idProofPhotoPreview');
    const emptyText = document.getElementById('idProofPhotoEmpty');

    if (input) input.value = imageData;
    if (previewImg) {
        previewImg.src = imageData;
        previewImg.style.display = 'block';
    }
    if (emptyText) emptyText.style.display = 'none';
    alert('ID proof photo captured successfully');
}

function resetBookingCaptureSection() {
    const customerInput = document.getElementById('bookingCustomerPhotoData');
    const idInput = document.getElementById('bookingIdProofPhotoData');
    const customerPreview = document.getElementById('customerPhotoPreview');
    const idPreview = document.getElementById('idProofPhotoPreview');
    const customerEmpty = document.getElementById('customerPhotoEmpty');
    const idEmpty = document.getElementById('idProofPhotoEmpty');

    if (customerInput) customerInput.value = '';
    if (idInput) idInput.value = '';

    if (customerPreview) {
        customerPreview.src = '';
        customerPreview.style.display = 'none';
    }

    if (idPreview) {
        idPreview.src = '';
        idPreview.style.display = 'none';
    }

    if (customerEmpty) customerEmpty.style.display = 'block';
    if (idEmpty) idEmpty.style.display = 'block';

    stopBookingCameraStream();
}

async function viewBookingPhotos(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('photoViewerModal');
    const photoTitle = document.getElementById('photoViewerTitle');
    const customerImg = document.getElementById('viewerCustomerPhoto');
    const idProofImg = document.getElementById('viewerIdProofPhoto');
    const customerStatus = document.getElementById('viewerCustomerPhotoStatus');
    const idProofStatus = document.getElementById('viewerIdProofPhotoStatus');

    // Update title with booking ID and guest name
    if (photoTitle) {
        photoTitle.textContent = `Booking ${booking.id} - ${booking.guestName} Photos`;
    }

    modal.style.display = 'flex';
    customerStatus.textContent = "Loading photos...";
    idProofStatus.textContent = "Loading photos...";
    
    // Priority: in-memory → IndexedDB (local disk) → Firebase (cloud)
    let localCustomer = booking.customerPhotoUrl || booking.customerPhoto;
    let localIdProof = booking.idProofPhotoUrl || booking.idProofPhoto;

    // Try IndexedDB if not in memory
    if (!localCustomer || !localIdProof) {
        try {
            const localPhotos = await getPhotoFromLocal(bookingId);
            if (localPhotos) {
                if (localPhotos.customerPhoto && !localCustomer) localCustomer = localPhotos.customerPhoto;
                if (localPhotos.idProofPhoto && !localIdProof) localIdProof = localPhotos.idProofPhoto;
            }
        } catch(e) {
            console.warn('Could not fetch photos from IndexedDB:', e);
        }
    }

    // Fetch from Firestore collection if still missing
    if (!localCustomer || !localIdProof) {
        try {
            if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                const doc = await firebaseDb.collection('booking_photos').doc(String(bookingId)).get();
                if (doc.exists) {
                    const picData = doc.data();
                    if (picData.customerPhoto && !localCustomer) localCustomer = picData.customerPhoto;
                    if (picData.idProofPhoto && !localIdProof) localIdProof = picData.idProofPhoto;

                    // Cache cloud photos to IndexedDB for next time
                    savePhotoToLocal(bookingId, 
                        localCustomer || null, 
                        localIdProof || null
                    ).catch(err => console.warn('Failed to cache cloud photos to IndexedDB:', err));
                }
            }
        } catch(e) {
            console.warn("Could not fetch remote photos: ", e);
        }
    }

    if (localCustomer) {
        customerImg.src = localCustomer;
        customerImg.style.display = 'block';
        customerStatus.style.display = 'none';
    } else {
        customerImg.src = '';
        customerImg.style.display = 'none';
        customerStatus.textContent = "Not Available";
        customerStatus.style.display = 'block';
    }

    if (localIdProof) {
        idProofImg.src = localIdProof;
        idProofImg.style.display = 'block';
        idProofStatus.style.display = 'none';
    } else {
        idProofImg.src = '';
        idProofImg.style.display = 'none';
        idProofStatus.textContent = "Not Available";
        idProofStatus.style.display = 'block';
    }
}

function handlePhotoUpload(inputElement, captureType) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please select a file under 5MB.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        if (captureType === 'customer') {
            const hiddenInput = document.getElementById('bookingCustomerPhotoData');
            const previewImg = document.getElementById('customerPhotoPreview');
            const emptyText = document.getElementById('customerPhotoEmpty');

            if (hiddenInput) hiddenInput.value = imageData;
            if (previewImg) {
                previewImg.src = imageData;
                previewImg.style.display = 'block';
            }
            if (emptyText) emptyText.style.display = 'none';
            alert('Customer photo uploaded successfully');
        } else {
            const hiddenInput = document.getElementById('bookingIdProofPhotoData');
            const previewImg = document.getElementById('idProofPhotoPreview');
            const emptyText = document.getElementById('idProofPhotoEmpty');

            if (hiddenInput) hiddenInput.value = imageData;
            if (previewImg) {
                previewImg.src = imageData;
                previewImg.style.display = 'block';
            }
            if (emptyText) emptyText.style.display = 'none';
            alert('ID proof photo uploaded successfully');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
}

// ===== UPDATE CUSTOMER PHOTO (ADMIN ONLY) =====

window.triggerUpdateCustomerPhoto = function() {
    const fileInput = document.getElementById('updateCustomerPhotoInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleUpdateCustomerPhoto = function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        const viewerCustomerPhoto = document.getElementById('viewerCustomerPhoto');
        const photoViewerTitle = document.getElementById('photoViewerTitle');
        
        // Extract booking ID from title (format: "Booking BK### - Name Photos")
        const titleText = photoViewerTitle.textContent;
        const bookingIdMatch = titleText.match(/Booking (BK\d+)/);
        const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        
        if (!bookingId) {
            alert('Could not identify booking. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Find booking in data
        const booking = data.bookings.find(b => b.id === bookingId);
        if (!booking) {
            alert('Booking not found. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Update the image preview immediately
        viewerCustomerPhoto.src = imageData;
        viewerCustomerPhoto.style.display = 'block';
        
        // Update booking locally
        booking.customerPhoto = imageData;
        booking.customerPhotoUrl = imageData;
        
        // Save to IndexedDB (local disk)
        getPhotoFromLocal(bookingId).then(existing => {
            savePhotoToLocal(bookingId, imageData, existing ? existing.idProofPhoto : (booking.idProofPhoto || null))
                .then(() => console.log('Customer photo saved to IndexedDB'))
                .catch(err => console.warn('IndexedDB save failed:', err));
        });
        
        // Sync to Firebase (cloud)
        if (typeof firebaseDb !== 'undefined' && firebaseDb) {
            syncBookingToFirebase(booking)
                .then(() => {
                    console.log('Customer photo synced to Firebase');
                    alert('Customer photo updated successfully!');
                })
                .catch(err => {
                    console.error('Error uploading photo:', err);
                    alert('Photo updated but sync to cloud failed.');
                });
        } else {
            console.log('Firebase not available, update saved locally');
            alert('Customer photo updated successfully!');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
};

// ===== UPDATE ID PROOF PHOTO (ADMIN) =====

window.triggerUpdateIdProofPhoto = function() {
    const fileInput = document.getElementById('updateIdProofPhotoInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleUpdateIdProofPhoto = function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        const viewerIdProofPhoto = document.getElementById('viewerIdProofPhoto');
        const photoViewerTitle = document.getElementById('photoViewerTitle');
        
        // Extract booking ID from title (format: "Booking BK### - Name Photos")
        const titleText = photoViewerTitle.textContent;
        const bookingIdMatch = titleText.match(/Booking (BK\d+)/);
        const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        
        if (!bookingId) {
            alert('Could not identify booking. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Find booking in data
        const booking = data.bookings.find(b => b.id === bookingId);
        if (!booking) {
            alert('Booking not found. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Update the image preview immediately
        viewerIdProofPhoto.src = imageData;
        viewerIdProofPhoto.style.display = 'block';
        
        // Update booking locally
        booking.idProofPhoto = imageData;
        booking.idProofPhotoUrl = imageData;
        
        // Save to IndexedDB (local disk)
        getPhotoFromLocal(bookingId).then(existing => {
            savePhotoToLocal(bookingId, existing ? existing.customerPhoto : (booking.customerPhoto || null), imageData)
                .then(() => console.log('ID proof photo saved to IndexedDB'))
                .catch(err => console.warn('IndexedDB save failed:', err));
        });
        
        // Sync to Firebase (cloud)
        if (typeof firebaseDb !== 'undefined' && firebaseDb) {
            syncBookingToFirebase(booking)
                .then(() => {
                    console.log('ID proof photo synced to Firebase');
                    alert('ID proof photo updated successfully!');
                })
                .catch(err => {
                    console.error('Error uploading photo:', err);
                    alert('Photo updated but sync to cloud failed.');
                });
        } else {
            console.log('Firebase not available, update saved locally');
            alert('ID proof photo updated successfully!');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
};

// ===== RECOVER MISSING PHOTOS =====

window.openRecoverPhotosModal = function() {
    const modal = document.getElementById('recoverPhotosModal');
    if (modal) {
        modal.style.display = 'flex';
        fetchOrphanedPhotos();
    }
};

window.closeRecoverPhotosModal = function() {
    const modal = document.getElementById('recoverPhotosModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

async function fetchOrphanedPhotos() {
    const statusEl = document.getElementById('recoverPhotosStatus');
    const gridEl = document.getElementById('recoverPhotosGrid');
    
    if (!firebaseEnabled || !firebaseDb) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Database connection not available.';
        return;
    }
    
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning cloud database for orphaned photos...';
    gridEl.innerHTML = '';
    
    try {
        const snapshot = await firebaseDb.collection('booking_photos').get();
        const orphaned = [];
        
        // Find documents in booking_photos that do NOT have a corresponding active booking
        snapshot.forEach(doc => {
            const photoId = doc.id; // e.g. "BK003"
            const bookingExists = data.bookings.some(b => b.id === photoId);
            
            if (!bookingExists) {
                const docData = doc.data();
                if (docData.customerPhoto || docData.idProofPhoto) {
                    orphaned.push({
                        id: photoId,
                        data: docData
                    });
                }
            }
        });
        
        if (orphaned.length === 0) {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> No orphaned photos found in the database. All existing photos are properly linked.';
            return;
        }
        
        statusEl.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i> Found ${orphaned.length} photo record(s) not linked to any active booking.`;
        
        // Render orphaned photos
        orphaned.forEach(item => {
            const hasCust = item.data.customerPhoto ? 'Yes' : 'No';
            const hasId = item.data.idProofPhoto ? 'Yes' : 'No';
            
            // Build options for current bookings (last 20 to avoid massive lists)
            const recentBookings = [...data.bookings].sort((first, second) => {
                const firstTimestamp = new Date(first.createdAt || first.checkIn || 0).getTime();
                const secondTimestamp = new Date(second.createdAt || second.checkIn || 0).getTime();
                return secondTimestamp - firstTimestamp;
            }).slice(0, 30);
            let optionsHtml = '<option value="">Select booking to assign...</option>';
            recentBookings.forEach(b => {
                optionsHtml += `<option value="${b.id}">${b.id} - ${b.guestName} (Room ${b.roomName})</option>`;
            });
            
            const cardHtml = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 10px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 13px;">
                        Found ID: ${item.id}
                    </div>
                    <div style="padding: 15px; flex: 1; display: flex; gap: 10px; justify-content: center; background: #f8fafc;">
                        ${item.data.customerPhoto ? `<img src="${item.data.customerPhoto}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" title="Customer Photo">` : ''}
                        ${item.data.idProofPhoto ? `<img src="${item.data.idProofPhoto}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" title="ID Proof">` : ''}
                    </div>
                    <div style="padding: 15px; border-top: 1px solid #e2e8f0;">
                        <select id="assign-target-${item.id}" style="width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px;">
                            ${optionsHtml}
                        </select>
                        <button class="btn-primary" onclick="assignPhotoToBooking('${item.id}')" style="width: 100%; font-size: 12px; padding: 8px;">
                            <i class="fas fa-link"></i> Assign to Booking
                        </button>
                    </div>
                </div>
            `;
            gridEl.insertAdjacentHTML('beforeend', cardHtml);
        });
        
    } catch (err) {
        console.error("Error fetching orphaned photos:", err);
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Failed to fetch photos from cloud database. See console for details.';
    }
}

window.assignPhotoToBooking = async function(orphanedId) {
    const selectEl = document.getElementById(`assign-target-${orphanedId}`);
    if (!selectEl) return;
    
    const targetBookingId = selectEl.value;
    if (!targetBookingId) {
        alert("Please select a booking to assign the photos to.");
        return;
    }
    
    const targetBooking = data.bookings.find(b => b.id === targetBookingId);
    if (!targetBooking) {
        alert("Selected booking not found.");
        return;
    }
    
    const confirmAssign = confirm(`Assign photos from ${orphanedId} to booking ${targetBooking.id} (${targetBooking.guestName})?`);
    if (!confirmAssign) return;
    
    try {
        // Fetch orphaned document data
        const orphanedDoc = await firebaseDb.collection('booking_photos').doc(String(orphanedId)).get();
        if (!orphanedDoc.exists) {
            alert("Orphaned photo no longer exists in database.");
            return;
        }
        
        const photoData = orphanedDoc.data();
        
        // Merge into target booking
        await firebaseDb.collection('booking_photos').doc(String(targetBookingId)).set(photoData, { merge: true });
        
        // Delete orphaned document
        await firebaseDb.collection('booking_photos').doc(String(orphanedId)).delete();
        
        // Update local booking flags
        if (photoData.customerPhoto) {
            targetBooking.hasCustomerPhoto = true;
            targetBooking.customerPhotoUrl = photoData.customerPhoto; // Cache locally
        }
        if (photoData.idProofPhoto) {
            targetBooking.hasIdProofPhoto = true;
            targetBooking.idProofPhotoUrl = photoData.idProofPhoto; // Cache locally
        }
        
        // Save assigned photos to IndexedDB (local disk)
        savePhotoToLocal(targetBookingId, photoData.customerPhoto || null, photoData.idProofPhoto || null)
            .then(() => console.log(`Assigned photos saved to IndexedDB for ${targetBookingId}`))
            .catch(err => console.warn('IndexedDB save after assignment failed:', err));
        
        saveDataToStorage();
        syncBookingToFirebase(targetBooking); // Resync
        loadBookings(); // Refresh UI
        
        alert(`Successfully assigned photos to ${targetBooking.id}!`);
        
        // Refresh the orphaned photos list
        fetchOrphanedPhotos();
        
    } catch (err) {
        console.error("Failed to assign photos:", err);
        alert("An error occurred while assigning photos. Please try again.");
    }
};

// View All Photos in Database Gallery
window.viewAllPhotosInDatabase = async function() {
    const modal = document.getElementById('allPhotosModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    const statusEl = document.getElementById('allPhotosStatus');
    const gridEl = document.getElementById('allPhotosGrid');
    
    if (!firebaseEnabled || !firebaseDb) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Database connection not available.';
        gridEl.innerHTML = '';
        return;
    }
    
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading all photos from database...';
    gridEl.innerHTML = '';
    
    try {
        const snapshot = await firebaseDb.collection('booking_photos').get();
        let photoCount = 0;
        const photoCards = [];
        
        snapshot.forEach(doc => {
            const bookingId = doc.id;
            const docData = doc.data();
            const booking = data.bookings.find(b => b.id === bookingId);
            const guestName = booking ? booking.guestName : 'Unknown Guest';
            
            if (docData.customerPhoto) {
                photoCount++;
                const photoSrc = docData.customerPhoto;
                const safePhotoId = `photo-cust-${bookingId}-${photoCount}`;
                
                const card = `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 8px 10px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                            <div style="font-weight: 600; font-size: 12px; color: var(--primary-brand); word-break: break-word;">
                                <i class="fas fa-id-card"></i> ${bookingId}
                            </div>
                            <div style="font-size: 11px; color: var(--text-light); margin-top: 2px; word-break: break-word;">
                                ${guestName}
                            </div>
                        </div>
                        <div style="padding: 8px; background: #f8fafc; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 180px; position: relative; overflow: hidden;">
                            <div id="load-${safePhotoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f4f8; z-index: 1;">
                                <i class="fas fa-spinner fa-spin" style="color: #94a3b8; font-size: 24px;"></i>
                            </div>
                            <img id="${safePhotoId}" src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; position: relative; z-index: 2;" data-title="Customer - ${bookingId}" title="Click to expand" 
                                onload="const loader = document.getElementById('load-${safePhotoId}'); if(loader) loader.style.display='none';" 
                                onerror="document.getElementById('load-${safePhotoId}').innerHTML='<div style=\"text-align:center;color:#94a3b8;\"><i class=\"fas fa-exclamation-circle\" style=\"font-size:24px;margin-bottom:8px;display:block;\"></i><span style=\"font-size:11px;\">Failed to load</span></div>';"> 
                        </div>
                        <div style="padding: 6px 10px; background: white; font-size: 10px; font-weight: 600; color: var(--text-light); border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                            Guest Photo
                        </div>
                    </div>
                `;
                photoCards.push(card);
            }
            
            if (docData.idProofPhoto) {
                photoCount++;
                const photoSrc = docData.idProofPhoto;
                const safePhotoId = `photo-id-${bookingId}-${photoCount}`;
                
                const card = `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 8px 10px; background: #fff5f5; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                            <div style="font-weight: 600; font-size: 12px; color: #e74c3c; word-break: break-word;">
                                <i class="fas fa-passport"></i> ${bookingId}
                            </div>
                            <div style="font-size: 11px; color: var(--text-light); margin-top: 2px; word-break: break-word;">
                                ${guestName}
                            </div>
                        </div>
                        <div style="padding: 8px; background: #f8fafc; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 180px; position: relative; overflow: hidden;">
                            <div id="load-${safePhotoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f4f8; z-index: 1;">
                                <i class="fas fa-spinner fa-spin" style="color: #94a3b8; font-size: 24px;"></i>
                            </div>
                            <img id="${safePhotoId}" src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; position: relative; z-index: 2;" data-title="ID Proof - ${bookingId}" title="Click to expand"
                                onload="const loader = document.getElementById('load-${safePhotoId}'); if(loader) loader.style.display='none';" 
                                onerror="document.getElementById('load-${safePhotoId}').innerHTML='<div style=\"text-align:center;color:#94a3b8;\"><i class=\"fas fa-exclamation-circle\" style=\"font-size:24px;margin-bottom:8px;display:block;\"></i><span style=\"font-size:11px;\">Failed to load</span></div>';">
                        </div>
                        <div style="padding: 6px 10px; background: white; font-size: 10px; font-weight: 600; color: var(--text-light); border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                            ID Proof
                        </div>
                    </div>
                `;
                photoCards.push(card);
            }
        });
        
        // Add all cards to grid
        photoCards.forEach(card => {
            gridEl.insertAdjacentHTML('beforeend', card);
        });
        
        // Attach click handlers to all images
        setTimeout(() => {
            const allImages = gridEl.querySelectorAll('img');
            allImages.forEach(img => {
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    expandPhoto(this);
                }, false);
            });
        }, 100);
        
        if (photoCount === 0) {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> No photos found in the database.';
        } else {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Found <strong>${photoCount}</strong> photo(s) in the database.`;
        }
        
    } catch (err) {
        console.error("Error fetching all photos:", err);
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Failed to fetch photos from database. See console for details.';
        gridEl.innerHTML = '';
    }
};

window.closeAllPhotosModal = function() {
    const modal = document.getElementById('allPhotosModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.expandPhoto = function(element) {
    if (!element || !element.src) {
        console.error('Invalid element passed to expandPhoto');
        return;
    }
    
    const photoSrc = element.src;
    const title = element.getAttribute('data-title') || 'Photo';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'expandPhotoModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 20px;';
    
    // Create container for image
    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;';
    
    // Add loading indicator
    const loader = document.createElement('div');
    loader.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff;';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>';
    container.appendChild(loader);
    
    // Create image element
    const img = document.createElement('img');
    img.src = photoSrc;
    img.style.cssText = 'max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: none;';
    
    // Handle image load
    img.onload = function() {
        loader.style.display = 'none';
        img.style.display = 'block';
    };
    
    // Handle image error
    img.onerror = function() {
        loader.innerHTML = '<div style="text-align: center; color: #fff;"><i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 10px; display: block;"></i><p>Failed to load image</p></div>';
    };
    
    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'position: absolute; top: 20px; left: 20px; color: white; font-size: 16px; font-weight: 600; background: rgba(0,0,0,0.8); padding: 12px 16px; border-radius: 6px; max-width: 300px; word-break: break-word;';
    titleDiv.textContent = title;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.95); border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 600; color: #333; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: all 0.3s;';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,1)'; };
    closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.95)'; };
    
    const closeModal = function() {
        modal.remove();
    };
    
    closeBtn.onclick = closeModal;
    
    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Close on ESC key
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Add elements to container
    container.appendChild(img);
    modal.appendChild(container);
    modal.appendChild(titleDiv);
    modal.appendChild(closeBtn);
    
    document.body.appendChild(modal);
};
