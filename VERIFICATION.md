# Kết quả kiểm tra bản popup 1.3 — lưu API key — 23/09/2026

## Đã chạy

- `npm test`: **21 ca đạt, 0 lỗi**, Node.js 24.18.0.
- `node --check` cho các file JavaScript: đạt.
- Nạp manifest và extension thật vào Chrome for Testing 151 / Chromium bằng Playwright, profile thử nghiệm riêng: đạt.
- Giao diện tiếng Việt: kiểm tra ảnh chụp toàn trang, không thấy cắt chữ hoặc tràn bố cục.
- Popup 360 px: không tràn ngang; Tùy chọn và Nhật ký mặc định thu gọn.
- 0 lỗi JavaScript trên trang trong kiểm thử trình duyệt.

## Kịch bản trình duyệt đã xác minh

Mọi yêu cầu Coursera được chặn và trả dữ liệu giả lập; không truy cập tài khoản thật.

1. Manifest khai báo popup cho biểu tượng extension. Tự nhận tab Coursera, điền slug và tải khóa học.
2. Tải 4 mục, hiển thị đúng 1 video và 1 bài tập sẵn sàng. Hai nút Skip video / Làm bài tập được kiểm tra riêng.
3. Đọc cookie CSRF giả lập có thuộc tính HttpOnly, gửi đúng header qua script trong tab Coursera.
4. Skip video chỉ gửi sự kiện kết thúc video; nhận lại tiến độ 1/4, không gửi hoàn tất bài đọc hoặc bài tập.
5. Làm bài tập gửi đúng hai loại assignment tới tác vụ nền. Thiếu API key thì không phát sinh yêu cầu ghi, tự mở Tùy chọn.
6. Chạy lại không phát sinh yêu cầu hoàn tất trùng.
7. Đóng giao diện ngay khi đang chạy: tác vụ nền vẫn hoàn tất, không tự mở thêm tab.
8. Mở lại giao diện: hiển thị tiến độ đã hoàn tất; có thể dừng tác vụ từ giao diện vừa mở lại.
9. Coursera trả HTTP 403: hiện lỗi, vô hiệu hóa nút Bắt đầu cho dữ liệu tải lỗi.

Kiểm thử vòng đời popup sử dụng trang extension được mở/đóng trong profile tự động hóa; chưa thao tác click biểu tượng trên thanh công cụ Chrome thật.

## Kiểm tra lưu API key

- Lưu key giả lập, đóng và mở popup: key vẫn được nạp, ô nhập vẫn là password.
- Gemini và Perplexity giữ key riêng, đổi nhà cung cấp không dùng nhầm key.
- Xóa key chỉ ảnh hưởng nhà cung cấp đang chọn; mở lại không khôi phục key đã xóa.
- Key không xuất hiện trong trạng thái hoặc nhật ký tác vụ nền.
- Kiểm tra chỉ dùng key giả lập trong profile thử nghiệm, không gọi AI thật.

## Phạm vi kiểm thử đơn vị

- Tác vụ nền độc lập với popup, không lưu API key, chặn lần chạy trùng và không tự chạy lại tác vụ bị gián đoạn.
- URL khóa học và nguồn website hợp lệ.
- Thiếu cấu trúc khóa học/tiến độ thì dừng.
- Bỏ qua mục hoàn tất, khóa, đã thử và loại chưa chọn.
- Kiểm tra đủ đáp án, ID, số lựa chọn và lựa chọn hợp lệ trước khi nộp.
- Video lỗi không bị báo thành công; video không cho tua gọi sự kiện theo đúng thứ tự.
- Làm mới khóa bài, xác minh tiến độ, không thử lại mục lỗi trong cùng lần chạy.
- Dừng ngăn xử lý mục tiếp theo.
- HTTP thành công không đồng nghĩa tiến độ hoàn tất.
- Loại câu hỏi chưa hỗ trợ không bị điền đáp án rỗng.
- Nộp ID bản nháp mới từ kết quả lưu; không nộp lặp khi thiếu phản hồi chấm điểm.
- Parse đáp án Gemini/Perplexity, cấu trúc yêu cầu và vị trí API key.
- Lỗi AI không hiện nội dung nhạy cảm từ phản hồi upstream.
- Giới hạn nguồn yêu cầu, lỗi xác thực/rate limit và GraphQL.

## Chưa kiểm chứng trực tiếp

- Phiên đăng nhập và các API Coursera hiện tại trên tài khoản thật.
- Luồng Coach, widget, LTI, chấm bài và đăng thảo luận trên khóa học thật.
- Kết nối Gemini / Perplexity bằng API key thật và điểm số AI tạo ra.
- Nạp trực tiếp trong Microsoft Edge; bản này dùng API extension Chromium chung.

Các kết quả trên xác minh mã và tích hợp trình duyệt với dữ liệu giả lập, không bảo đảm API Coursera chưa thay đổi hoặc mọi loại khóa học đều được hỗ trợ.
