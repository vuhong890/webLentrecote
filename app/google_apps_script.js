/**
 * GOOGLE APPS SCRIPT CHO GOOGLE SHEET ĐẶT BÀN L'ENTRECÔTE - SOCIAL MEATING (BOOKING.GS)
 * 
 * Hướng dẫn cài đặt:
 * 1. Mở file Google Sheet quản lý đặt bàn của nhà hàng.
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script -> Mở file Booking.gs.
 * 3. Xóa toàn bộ nội dung cũ trong Booking.gs và dán toàn bộ đoạn code này vào.
 * 4. Bấm biểu tượng "Lưu" (Save).
 * 5. Bấm "Triển khai" (Deploy) -> "Quản lý bản triển khai" (Manage deployments) 
 *    -> Chọn biểu tượng Bút chì (Chỉnh sửa) -> Ở mục Phiên bản chọn "Phiên bản mới" (New version) -> Bấm "Triển khai" (Deploy).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName("Reservation"); 
    if (!sheet) {
      sheet = doc.getActiveSheet();
    }
    
    var payload = JSON.parse(e.postData.contents);
    
    // --- HÀM PHỤ: ĐỔI GIỜ THÀNH PHÚT ---
    function parseTimeToMinutes(timeStr) {
      if (!timeStr) return 9999; 
      timeStr = timeStr.toString().toLowerCase().trim();
      timeStr = timeStr.split('-')[0].trim();
      timeStr = timeStr.replace(":", "h"); 
      
      var parts = timeStr.split("h");
      var hours = parseInt(parts[0], 10) || 0;
      var minutes = parseInt(parts[1], 10) || 0;
      return (hours * 60) + minutes;
    }

    // =========================================================================
    // TRƯỜNG HỢP 1: RESCHEDULE (ĐỔI GIỜ / DỜI LỊCH TỪ TELEGRAM HOẶC MESSENGER)
    // =========================================================================
    if (payload.loai_xu_ly === "Reschedule" || payload.loai_xu_ly === "Update") {
      var lastRow = sheet.getLastRow();
      var foundRow = -1;

      var cleanReqPhone = (payload.so_dien_thoai || "").toString().replace(/[^0-9]/g, "");
      if (cleanReqPhone.startsWith("84")) cleanReqPhone = "0" + cleanReqPhone.slice(2);

      var newTimeStr = payload.gio_dat_moi || payload.gio_dat || "";

      if (lastRow > 1) {
        var numRows = lastRow - 1;
        // Lấy cột B (Cột 2: Ngày đặt) và cột L (Cột 12: Số điện thoại)
        var dateValues = sheet.getRange(2, 2, numRows, 1).getValues();
        var phoneValues = sheet.getRange(2, 12, numRows, 1).getValues();

        // Quét từ dưới lên trên để ưu tiên đơn gần nhất
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

          var phoneMatch = cleanReqPhone && rowPhone && (rowPhone.indexOf(cleanReqPhone) !== -1 || cleanReqPhone.indexOf(rowPhone) !== -1);
          var dateMatch = !payload.ngay_dat || (rowDateStr && rowDateStr === payload.ngay_dat);

          if (phoneMatch && dateMatch) {
            foundRow = r + 2; // +2 vì dữ liệu bắt đầu từ dòng 2 (sau dòng tiêu đề)
            break;
          }
        }
      }

      if (foundRow > 0) {
        // 1. Cập nhật Giờ mới vào Cột F (Cột 6) và đổi chữ đỏ nổi bật
        sheet.getRange(foundRow, 6).setValue(newTimeStr);
        sheet.getRange(foundRow, 6).setFontColor("#ff0000");

        // 2. Cập nhật Ghi chú vào Cột K (Cột 11)
        var currentNote = String(sheet.getRange(foundRow, 11).getValue() || "").trim();
        var updateTag = "[Đã đổi sang: " + newTimeStr + "]";
        if (currentNote.indexOf(updateTag) === -1) {
          var newNote = currentNote ? currentNote + " | " + updateTag : updateTag;
          sheet.getRange(foundRow, 11).setValue(newNote);
        }

        // 3. Cập nhật lại Thứ (Cột 1) & Ngày (Cột 2) nếu khách có đổi ngày
        if (payload.ngay_dat) {
          var dateParts = payload.ngay_dat.split('/');
          if (dateParts.length === 3) {
            var dateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            var daysOfWeekList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            sheet.getRange(foundRow, 1).setValue(daysOfWeekList[dateObj.getDay()]);
            sheet.getRange(foundRow, 2).setValue(payload.ngay_dat);
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          action: "rescheduled",
          row: foundRow,
          new_time: newTimeStr
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Nếu không tìm thấy dòng cũ trong Sheet (edge case), gán thêm tag và chạy tiếp xuống để chèn dòng mới
      payload.ghi_chu = (payload.ghi_chu || "") + " [Reschedule]";
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: ĐƠN MỚI BÌNH THƯỜNG (loai_xu_ly == "Yes")
    // =========================================================================

    // --- BƯỚC 1: XỬ LÝ NGÀY VÀ THỨ ---
    var reqDateStr = payload.ngay_dat; 
    var reqParts = reqDateStr.split('/');
    var reqDateObj = new Date(reqParts[2], reqParts[1]-1, reqParts[0]);
    var reqDate = reqDateObj.getTime();
    var reqTime = parseTimeToMinutes(payload.gio_dat); 
    
    var daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var dayOfWeekStr = daysOfWeek[reqDateObj.getDay()];

    // --- BƯỚC 2: TÌM VỊ TRÍ & XÁC ĐỊNH HƯỚNG COPY FORMAT ---
    var range = sheet.getRange("B2:F" + sheet.getLastRow()).getValues();
    var insertPos = sheet.getLastRow(); 
    
    var dateFound = false;
    var timePositionFound = false;
    var lastClosestPos = 1; 
    var closestDateDiff = Infinity;
    var formatSource = "above"; // Mặc định lấy dòng trên

    for (var i = 0; i < range.length; i++) {
      var cellB = range[i][0]; 
      var cellF = range[i][4]; 
      var rowNum = i + 2;
      var cellTime = null;

      if (cellB instanceof Date) {
        cellTime = cellB.getTime();
      } else if (typeof cellB === 'string' && cellB.trim() !== "") {
        var parts = cellB.split("/");
        if (parts.length === 3) {
          cellTime = new Date(parts[2], parts[1]-1, parts[0]).getTime();
        }
      }

      if (cellTime === reqDate) {
        dateFound = true;
        if (!timePositionFound) {
          var existingTime = parseTimeToMinutes(cellF);
          if (existingTime > reqTime) {
            insertPos = rowNum - 1; 
            timePositionFound = true; 
            formatSource = "below"; // Đẩy dòng xuống nên phải copy format từ dưới
          } else {
            insertPos = rowNum; 
            formatSource = "above"; // Nối tiếp ở dưới nên copy format từ trên
          }
        }
      } else if (!dateFound && cellTime && cellTime < reqDate) {
        var diff = reqDate - cellTime;
        if (diff <= closestDateDiff) {
          closestDateDiff = diff;
          lastClosestPos = rowNum;
        }
      }
    }

    if (!dateFound) {
      insertPos = lastClosestPos;
      formatSource = "above";
    }

    // --- BƯỚC 3: CHÈN DÒNG VÀ COPY FORMAT THÔNG MINH (CHỐNG LỖI MẤT MÀU) ---
    sheet.insertRowAfter(insertPos);
    var newRow = insertPos + 1;

    // Quyết định lấy format từ dòng nào
    var copyFromRow = (formatSource === "below") ? (newRow + 1) : (newRow - 1);
    if (copyFromRow < 2) copyFromRow = 2; // Chống copy nhầm dòng tiêu đề

    // Dùng getMaxColumns() để quét sạch đến cột cuối cùng
    var maxCols = sheet.getMaxColumns(); 
    var sourceRange = sheet.getRange(copyFromRow, 1, 1, maxCols);
    var targetRange = sheet.getRange(newRow, 1, 1, maxCols);
    
    // 1. Copy định dạng viền, lề và Data Validation (Checkbox, Dropdown)
    sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    
    // 2. ÉP CỨNG MÀU NỀN TỪ DÒNG MẪU
    var bgColors = sourceRange.getBackgrounds();
    targetRange.setBackgrounds(bgColors);
    
    // 3. Phục hồi công thức (nếu có)
    var sourceFormulas = sourceRange.getFormulas();
    targetRange.setFormulas(sourceFormulas);

    // 4. Ép chữ đỏ cho đơn mới 
    targetRange.setFontColor("#ff0000"); 

    // --- BƯỚC 4: ĐIỀN DỮ LIỆU ---
    sheet.getRange(newRow, 1).setValue(dayOfWeekStr);            
    sheet.getRange(newRow, 2).setValue(payload.ngay_dat);        
    sheet.getRange(newRow, 3).setValue(payload.ten_khach);        
    sheet.getRange(newRow, 4).setValue(payload.so_nguoi);        
    sheet.getRange(newRow, 6).setValue(payload.gio_dat);          
    sheet.getRange(newRow, 11).setValue(payload.ghi_chu || "");   
    sheet.getRange(newRow, 12).setValue(payload.so_dien_thoai);

    // ĐIỀN NGUỒN ĐƠN HÀNG VÀO CỘT M (13) - PIC NHÂN VIÊN
    sheet.getRange(newRow, 13).setValue(payload.nguon || "");
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "row": newRow, "day": dayOfWeekStr})).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
