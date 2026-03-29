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
  },
};

export function useTranslation() {
  const { lang } = useLanguage();
  return useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);
}
