import { useUI } from '../ui/UIContext.jsx';
import ReceiptModal from './ReceiptModal.jsx';
import CheckoutModal from './CheckoutModal.jsx';
import EditBookingModal from './EditBookingModal.jsx';
import RoomDetailsModal from './RoomDetailsModal.jsx';
import GuestDetailsModal from './GuestDetailsModal.jsx';
import { ChangePasswordModal, ExtraAmountModal, PriceModal } from './SmallModals.jsx';
import { AllPhotosModal, ExpandPhotoModal, GuestPhotoHistoryModal, PhotoViewerModal, RecoverPhotosModal } from './PhotoModals.jsx';

const MODALS = {
    receipt: ReceiptModal,
    checkout: CheckoutModal,
    editBooking: EditBookingModal,
    roomDetails: RoomDetailsModal,
    guestDetails: GuestDetailsModal,
    price: PriceModal,
    extraAmount: ExtraAmountModal,
    changePassword: ChangePasswordModal,
    photoViewer: PhotoViewerModal,
    guestPhotoHistory: GuestPhotoHistoryModal,
    allPhotos: AllPhotosModal,
    recoverPhotos: RecoverPhotosModal,
    expandPhoto: ExpandPhotoModal
};

// Renders the open modals in the order they were opened, so the newest is always on top
export default function ModalHost() {
    const { modals, closeModal } = useUI();
    return modals.map(({ type, props }) => {
        const Component = MODALS[type];
        if (!Component) return null;
        const key = `${type}:${props.bookingId || props.roomId || props.guestName || props.src?.slice(-24) || ''}`;
        return <Component key={key} {...props} onClose={() => closeModal(type)} />;
    });
}
