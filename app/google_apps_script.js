/**
 * GOOGLE APPS SCRIPT CHO GOOGLE SHEET ĐẶT BÀN L'ENTRECÔTE - SOCIAL MEATING
 * 
 * Hướng dẫn cài đặt:
 * 1. Mở file Google Sheet quản lý đặt bàn của nhà hàng.
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa toàn bộ nội dung cũ trong file Code.gs (hoặc tạo file mới) và dán toàn bộ đoạn code này vào.
 * 4. Bấm "Triển khai" (Deploy) -> "Quản lý bản triển khai" (Manage deployments) -> Chọn icon Bút chì (Chỉnh sửa) 
 *    -> Chọn "Phiên bản mới" (New version) -> Bấm "Triển khai" (Deploy).
 *    (Hoặc tạo bản triển khai mới dưới dạng Ứng dụng web - Web app: Ai có quyền truy cập: "Bất kỳ ai" / "Anyone").
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Khóa 10s tránh xung đột ghi đè nhiều yêu cầu cùng lúc

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var loaiXuLy = data.loai_xu_ly || "Yes";
    var ngayDat = String(data.ngay_dat || "").trim();
    var tenKhach = String(data.ten_khach || "").trim();
    var soNguoi = data.so_nguoi || "";
    var gioDat = String(data.gio_dat || "").trim();
    var gioDatMoi = String(data.gio_dat_moi || gioDat || "").trim();
    var soDienThoai = String(data.so_dien_thoai || "").trim();
    var ghiChu = String(data.ghi_chu || "").trim();
    var nguon = String(data.nguon || "FB").trim();

    // 1. Phân tích tiêu đề cột từ dòng 1
    var lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) lastColumn = 7;
    var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    var colNgay = -1;
    var colTen = -1;
    var colSoNguoi = -1;
    var colGio = -1;
    var colGhiChu = -1;
    var colSdt = -1;
    var colNguon = -1;

    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i]).toLowerCase().trim();
      if (h.indexOf("ngày") !== -1 || h.indexOf("date") !== -1) colNgay = i + 1;
      else if (h.indexOf("tên") !== -1 || h.indexOf("name") !== -1 || h.indexOf("khách") !== -1) colTen = i + 1;
      else if (h.indexOf("người") !== -1 || h.indexOf("guest") !== -1 || h.indexOf("số lượng") !== -1) colSoNguoi = i + 1;
      else if (h.indexOf("giờ") !== -1 || h.indexOf("time") !== -1) colGio = i + 1;
      else if (h.indexOf("ghi chú") !== -1 || h.indexOf("note") !== -1) colGhiChu = i + 1;
      else if (h.indexOf("thoại") !== -1 || h.indexOf("phone") !== -1 || h.indexOf("sđt") !== -1 || h.indexOf("sdt") !== -1) colSdt = i + 1;
      else if (h.indexOf("nguồn") !== -1 || h.indexOf("source") !== -1) colNguon = i + 1;
    }

    // Nếu không tìm thấy theo tên cột, dùng vị trí mặc định phổ biến
    if (colNgay === -1) colNgay = 1;
    if (colTen === -1) colTen = 2;
    if (colSoNguoi === -1) colSoNguoi = 3;
    if (colGio === -1) colGio = 4;
    if (colGhiChu === -1) colGhiChu = 5;
    if (colSdt === -1) colSdt = 6;
    if (colNguon === -1) colNguon = 7;

    // Chuẩn hóa số điện thoại chỉ lấy chữ số
    var cleanInputPhone = soDienThoai.replace(/[^0-9]/g, "");
    if (cleanInputPhone.startsWith("84")) cleanInputPhone = "0" + cleanInputPhone.slice(2);

    // ==========================================
    // TRƯỜNG HỢP 1: RESCHEDULE (ĐỔI GIỜ / DỜI LỊCH)
    // ==========================================
    if (loaiXuLy === "Reschedule" || loaiXuLy === "Update") {
      var lastRow = sheet.getLastRow();
      var foundRow = -1;

      if (lastRow > 1) {
        var numRows = lastRow - 1;
        var phoneValues = sheet.getRange(2, colSdt, numRows, 1).getValues();
        var dateValues = sheet.getRange(2, colNgay, numRows, 1).getValues();

        // Duyệt từ dưới lên trên để ưu tiên đơn gần nhất
        for (var r = numRows - 1; r >= 0; r--) {
          var rowPhone = String(phoneValues[r][0] || "").replace(/[^0-9]/g, "");
          if (rowPhone.startsWith("84")) rowPhone = "0" + rowPhone.slice(2);

          var rawDate = dateValues[r][0];
          var rowDateStr = "";
          if (rawDate instanceof Date) {
            var d = ("0" + rawDate.getDate()).slice(-2);
            var m = ("0" + (rawDate.getMonth() + 1)).slice(-2);
            var y = rawDate.getFullYear();
            rowDateStr = d + "/" + m + "/" + y;
          } else {
            rowDateStr = String(rawDate || "").trim();
          }

          // Kiểm tra trùng SĐT (và trùng ngày nếu có)
          var phoneMatch = cleanInputPhone && rowPhone && (rowPhone.indexOf(cleanInputPhone) !== -1 || cleanInputPhone.indexOf(rowPhone) !== -1);
          var dateMatch = !ngayDat || (rowDateStr && rowDateStr === ngayDat);

          if (phoneMatch && dateMatch) {
            foundRow = r + 2; // +2 vì index bắt đầu từ 0 và có hàng tiêu đề dòng 1
            break;
          }
        }
      }

      if (foundRow > 0) {
        // 1. Cập nhật ô Giờ Đặt Bàn thành giờ mới
        sheet.getRange(foundRow, colGio).setValue(gioDatMoi);

        // 2. Cập nhật cột Ghi chú
        var currentNote = String(sheet.getRange(foundRow, colGhiChu).getValue() || "").trim();
        var updateTag = "[Đã đổi sang: " + gioDatMoi + "]";
        if (currentNote.indexOf(updateTag) === -1) {
          var newNote = currentNote ? currentNote + " | " + updateTag : updateTag;
          sheet.getRange(foundRow, colGhiChu).setValue(newNote);
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          action: "updated",
          row: foundRow,
          new_time: gioDatMoi
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Nếu không tìm thấy dòng cũ (edge case), ghi thêm dòng mới để không mất thông tin
        sheet.appendRow([
          ngayDat,
          tenKhach,
          soNguoi,
          gioDatMoi,
          ghiChu ? ghiChu + " [Reschedule]" : "[Reschedule]",
          soDienThoai,
          nguon
        ]);

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          action: "appended_fallback",
          new_time: gioDatMoi
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ==========================================
    // TRƯỜNG HỢP 2: ĐƠN MỚI BÌNH THƯỜNG (loai_xu_ly == "Yes")
    // ==========================================
    sheet.appendRow([
      ngayDat,
      tenKhach,
      soNguoi,
      gioDat,
      ghiChu,
      soDienThoai,
      nguon
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "created"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
