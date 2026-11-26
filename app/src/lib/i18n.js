'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: () => '' });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  // Translate a record field: t(item, 'name') → item.name_en, item.name_vi, or item.name_ja
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
    discoverStory: 'DISCOVER OUR STORY', reserveTable: 'RESERVE YOUR TABLE', exploreFullMenu: 'EXPLORE FULL MENU', viewFullGallery: 'VIEW FULL GALLERY',
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
    specialRequests: 'Special Requests (not guaranteed)',
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
    discoverStory: 'KHÁM PHÁ CÂU CHUYỆN', reserveTable: 'ĐẶT BÀN NGAY', exploreFullMenu: 'XEM TOÀN BỘ THỰC ĐƠN', viewFullGallery: 'XEM TOÀN BỘ ẢNH',
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
    specialRequests: 'Yêu Cầu Đặc Biệt (không đảm bảo)',
    allergiesPlaceholder: 'Dị ứng, sự kiện, sở thích chỗ ngồi...',
    confirmReservation: 'XÁC NHẬN ĐẶT BÀN',
    submitting: 'ĐANG GỬI...',
    reservationConfirmedTitle: 'Đặt Bàn Thành Công',
    reservationConfirmedDesc: 'Chúng tôi rất mong được đón tiếp bạn. Xác nhận đã được gửi đến email của bạn.',
    dressCode: 'TRANG PHỤC',
    smartCasual: 'Lịch sự, Thoải mái',
    location: 'ĐỊA CHỈ',
  },
  ja: {
    home: 'ホーム', heritage: '伝統と歴史', menus: 'メニュー', reservation: 'ご予約',
    gallery: 'ギャラリー', contact: 'お問い合わせ', admin: '管理画面',
    bookTable: 'テーブルを予約', exploreMenu: 'メニューを見る',
    discoverStory: '私たちの物語を見る', reserveTable: '今すぐ予約する', exploreFullMenu: '全メニューを見る', viewFullGallery: 'ギャラリーをすべて見る',
    name: 'お名前 (アルファベットを使用)', phone: '電話番号', email: 'メールアドレス', date: '日付', time: '時間',
    guests: '人数', branch: '店舗', notes: '特別なご要望',
    submit: '送信', confirm: '確認', cancel: 'キャンセル',
    pending: '保留中', confirmed: '確認済み', cancelled: 'キャンセル済み',
    search: '検索...', noResults: '結果が見つかりません',
    login: 'ログイン', logout: 'ログアウト', dashboard: 'ダッシュボード',
    menuManagement: 'メニュー管理', reservationManagement: '予約管理',
    galleryManagement: 'ギャラリー管理', pageManagement: 'ページ編集', settings: '設定',
    save: '保存', delete: '削除', edit: '編集', add: '新規追加',
    category: 'カテゴリー', price: '価格', description: '説明',
    image: '画像', status: 'ステータス', actions: '操作',
    switchToVi: 'Tiếng Việt', switchToEn: 'English', switchToJa: '日本語',
    // Contact page
    openingHours: '営業時間',
    lunch: 'ランチ', dinner: 'ディナー', lastOrder: 'ラストオーダー',
    openDaily: '年中無休',
    hotline: 'ホットライン',
    sendMessage: 'メッセージを送る (アルファベットを使用)',
    contactFormIntro: 'ご質問、ご感想、または特別なご要望がございましたら、お気軽にお問い合わせください。折り返しご連絡いたします。',
    yourName: 'お名前 (アルファベットを使用)',
    subject: '件名',
    subjectPlaceholder: 'お問い合わせ内容の概要',
    message: 'メッセージ',
    messagePlaceholder: 'メッセージを入力してください...',
    sendBtn: 'メッセージを送信',
    messageSentTitle: '送信完了',
    messageSentDesc: 'お問い合わせありがとうございます。24時間以内にご返信いたします。',
    fullNamePlaceholder: 'フルネーム',
    emailPlaceholder: 'your@email.com',
    // Reservation page
    bookATable: 'テーブル予約',
    reservationFormIntro: '特別なダイニング体験をご予約ください。8名様以上のご予約はお電話にて直接お問い合わせください：',
    selectTime: '時間を選択',
    guest: '名',
    guestsLabel: '人数',
    specialRequests: '特別なご要望（確約いたしかねます）',
    allergiesPlaceholder: 'アレルギー、記念日のお祝い、お席のご希望など...',
    confirmReservation: '予約を確定する',
    submitting: '送信中...',
    reservationConfirmedTitle: 'ご予約を受け付けました',
    reservationConfirmedDesc: '皆様のご来店を心よりお待ちしております。ご登録のメールアドレスに確認メールを送信いたしました。',
    dressCode: 'ドレスコード',
    smartCasual: 'スマートカジュアル',
    location: '所在地',
  },
};

export function useTranslation() {
  const { lang } = useLanguage();
  return useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);
}
