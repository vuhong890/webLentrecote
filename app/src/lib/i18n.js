'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: () => '' });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  // Translate a record field: t(item, 'name') → item.name_en or item.name_vi
  const t = useCallback((obj, field) => {
    if (!obj) return '';
    const key = `${field}_${lang}`;
    return obj[key] || obj[`${field}_en`] || '';
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Static translations for UI strings
const translations = {
  en: {
    home: 'Home', heritage: 'Heritage', menus: 'Menus', reservation: 'Reservation',
    gallery: 'Gallery', contact: 'Contact', admin: 'Admin',
    bookTable: 'Book a Table', exploreMenu: 'Explore Menu',
    name: 'Full Name', phone: 'Phone', email: 'Email', date: 'Date', time: 'Time',
    guests: 'Guests', branch: 'Branch', notes: 'Special Requests',
    submit: 'Submit', confirm: 'Confirm', cancel: 'Cancel',
    pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled',
    search: 'Search...', noResults: 'No results found',
    login: 'Login', logout: 'Logout', dashboard: 'Dashboard',
    menuManagement: 'Menu Management', reservationManagement: 'Reservations',
    galleryManagement: 'Gallery', pageManagement: 'Page Editor', settings: 'Settings',
    save: 'Save', delete: 'Delete', edit: 'Edit', add: 'Add New',
    category: 'Category', price: 'Price', description: 'Description',
    image: 'Image', status: 'Status', actions: 'Actions',
    switchToVi: 'Tiếng Việt', switchToEn: 'English',
    // Contact page
    openingHours: 'Opening Hours',
    lunch: 'Lunch', dinner: 'Dinner', lastOrder: 'Last order',
    openDaily: 'Open daily',
    hotline: 'Hotline',
    sendMessage: 'Send a Message',
    contactFormIntro: "Have a question, feedback, or a special request? Drop us a line and we'll get back to you promptly.",
    yourName: 'Your Name',
    subject: 'Subject',
    subjectPlaceholder: 'What is this about?',
    message: 'Message',
    messagePlaceholder: 'Your message...',
    sendBtn: 'SEND MESSAGE',
    messageSentTitle: 'Message Sent',
    messageSentDesc: "Thank you! We'll respond within 24 hours.",
    fullNamePlaceholder: 'Full name',
    emailPlaceholder: 'your@email.com',
    // Reservation page
    bookATable: 'Book a Table',
    reservationFormIntro: 'Reserve your spot for a curated dining experience. For parties over 8, please call us directly at',
    selectTime: 'Select time',
    guest: 'Guest',
    guestsLabel: 'Guests',
    specialRequests: 'Special Requests',
    allergiesPlaceholder: 'Allergies, celebrations, seating preferences...',
    confirmReservation: 'CONFIRM RESERVATION',
    submitting: 'SUBMITTING...',
    reservationConfirmedTitle: 'Reservation Confirmed',
    reservationConfirmedDesc: 'We look forward to welcoming you. A confirmation has been sent to your email.',
    dressCode: 'DRESS CODE',
    smartCasual: 'Smart Casual',
    location: 'LOCATION',
  },
  vi: {
    home: 'Trang chủ', heritage: 'Di sản', menus: 'Thực đơn', reservation: 'Đặt bàn',
    gallery: 'Bộ sưu tập', contact: 'Liên hệ', admin: 'Quản trị',
    bookTable: 'Đặt bàn', exploreMenu: 'Xem thực đơn',
    name: 'Họ tên', phone: 'Số điện thoại', email: 'Email', date: 'Ngày', time: 'Giờ',
    guests: 'Số khách', branch: 'Chi nhánh', notes: 'Ghi chú',
    submit: 'Gửi', confirm: 'Xác nhận', cancel: 'Hủy',
    pending: 'Chờ xử lý', confirmed: 'Đã xác nhận', cancelled: 'Đã hủy',
    search: 'Tìm kiếm...', noResults: 'Không tìm thấy kết quả',
    login: 'Đăng nhập', logout: 'Đăng xuất', dashboard: 'Bảng điều khiển',
    menuManagement: 'Quản lý thực đơn', reservationManagement: 'Quản lý đặt bàn',
    galleryManagement: 'Quản lý ảnh', pageManagement: 'Chỉnh sửa trang', settings: 'Cài đặt',
    save: 'Lưu', delete: 'Xóa', edit: 'Sửa', add: 'Thêm mới',
    category: 'Danh mục', price: 'Giá', description: 'Mô tả',
    image: 'Hình ảnh', status: 'Trạng thái', actions: 'Thao tác',
    switchToVi: 'Tiếng Việt', switchToEn: 'English',
    // Contact page
    openingHours: 'Giờ Mở Cửa',
    lunch: 'Trưa', dinner: 'Tối', lastOrder: 'Gọi món cuối',
    openDaily: 'Mở cửa hàng ngày',
    hotline: 'Đường dây nóng',
    sendMessage: 'Gửi Tin Nhắn',
    contactFormIntro: 'Bạn có câu hỏi, góp ý, hoặc yêu cầu đặc biệt? Hãy để lại lời nhắn và chúng tôi sẽ phản hồi sớm nhất.',
    yourName: 'Họ và Tên',
    subject: 'Chủ đề',
    subjectPlaceholder: 'Nội dung về vấn đề gì?',
    message: 'Tin nhắn',
    messagePlaceholder: 'Nội dung tin nhắn...',
    sendBtn: 'GỬI TIN NHẮN',
    messageSentTitle: 'Đã Gửi Tin Nhắn',
    messageSentDesc: 'Cảm ơn bạn! Chúng tôi sẽ phản hồi trong vòng 24 giờ.',
    fullNamePlaceholder: 'Họ và tên',
    emailPlaceholder: 'email@cuaban.com',
    // Reservation page
    bookATable: 'Đặt Bàn',
    reservationFormIntro: 'Đặt chỗ cho trải nghiệm ẩm thực tuyệt vời. Đối với nhóm trên 8 người, vui lòng gọi trực tiếp cho chúng tôi tại',
    selectTime: 'Chọn giờ',
    guest: 'Khách',
    guestsLabel: 'Số khách',
    specialRequests: 'Yêu Cầu Đặc Biệt',
    allergiesPlaceholder: 'Dị ứng, sự kiện, sở thích chỗ ngồi...',
    confirmReservation: 'XÁC NHẬN ĐẶT BÀN',
    submitting: 'ĐANG GỬI...',
    reservationConfirmedTitle: 'Đặt Bàn Thành Công',
    reservationConfirmedDesc: 'Chúng tôi rất mong được đón tiếp bạn. Xác nhận đã được gửi đến email của bạn.',
    dressCode: 'TRANG PHỤC',
    smartCasual: 'Lịch sự, Thoải mái',
    location: 'ĐỊA CHỈ',
  },
};

export function useTranslation() {
  const { lang } = useLanguage();
  return useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);
}
