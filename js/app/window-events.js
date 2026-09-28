
window.onclick = function (event) {
    const receiptModal = document.getElementById('receiptModal');
    const priceModal = document.getElementById('priceModal');
    const extraAmountModal = document.getElementById('extraAmountModal');
    const roomDetailsModal = document.getElementById('roomDetailsModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const guestPhotoHistoryModal = document.getElementById('guestPhotoHistoryModal');

    if (event.target == receiptModal) closeReceiptModal();
    if (event.target == priceModal) closePriceModal();
    if (event.target == extraAmountModal) closeExtraAmountModal();
    if (event.target == roomDetailsModal) closeRoomDetailsModal();
    if (event.target == changePasswordModal) closeChangePasswordModal();
    if (event.target == guestPhotoHistoryModal) closeGuestPhotoHistoryModal();
}

window.addEventListener('beforeunload', function () {
    stopBookingCameraStream();
    stopCheckoutReminderService();
    if (liveClockTimer) {
        clearInterval(liveClockTimer);
        liveClockTimer = null;
    }
});
