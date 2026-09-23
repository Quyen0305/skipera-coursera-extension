# Skipera Coursera 1.3 — lưu API key

Chuyển từ bản **Skipera 1.1.0** sang JavaScript / Manifest V3 cho Chrome và Edge. Khi sử dụng không cần Python, Anaconda, máy chủ hay lệnh terminal.

## Cài đặt

1. Nếu dùng ZIP: giải nén toàn bộ vào một thư mục cố định, ví dụ `D:\SkiperaExtension`.
2. Mở `chrome://extensions` trên Chrome hoặc `edge://extensions` trên Edge.
3. Bật **Developer mode / Chế độ nhà phát triển**.
4. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
5. Chọn thư mục chứa trực tiếp `manifest.json`. Có thể chọn ngay thư mục `outputs\skipera-extension` đã tạo, không cần dùng ZIP.
6. Ghim **Skipera Coursera** trong menu tiện ích nếu muốn.

Giữ nguyên thư mục sau khi cài. Khi cập nhật mã, bấm nút **Reload / Tải lại** trên trang quản lý tiện ích.

## Cập nhật từ bản trước

Nếu đang cài trực tiếp thư mục này, vào `chrome://extensions` hoặc `edge://extensions`, bấm **Reload / Tải lại** ở Skipera. Nếu cài từ thư mục đã giải nén khác, giải nén ZIP mới và thay nội dung ở thư mục đó trước khi Reload. Đóng bảng điều khiển cũ nếu còn mở.

## Sử dụng

1. Đăng nhập Coursera và mở khóa học.
2. Bấm biểu tượng **Skipera**: popup nhỏ xuất hiện ngay dưới biểu tượng, tự nhận và tải khóa học đang mở.
3. Bấm **Skip video** để chỉ xử lý video, không cần API key.
4. Hoặc bấm **Làm bài tập** để dùng AI làm và nộp bài. Nhập API key, model và cấp quyền trong **Tùy chọn** trước khi chạy. Mỗi lần chỉ chạy một tác vụ. Có thể đóng popup; giữ tab Coursera mở.
5. Bấm lại biểu tượng để xem tiến độ hoặc bấm **Dừng tác vụ**. Yêu cầu đã gửi có thể vẫn hoàn tất.
6. Bấm **Tải** khi muốn cập nhật lại tiến độ. Có thể nhập URL/slug khác; danh sách tab nằm trong **Tùy chọn**.

Tiến độ “Đã hoàn tất” lấy từ Coursera. Nhật ký “đã gửi yêu cầu” không đồng nghĩa đã được xác nhận hoàn tất. Phần Nhật ký và Tùy chọn mặc định thu gọn.

Nếu đóng trình duyệt, Reload extension hoặc tác vụ nền bị hệ thống chấm dứt, tác vụ không tự chạy lại. Hãy mở popup, tải lại khóa học và kiểm tra tiến độ trước khi chạy tiếp.

## Hai nút tác vụ

| Nút | Phạm vi |
|---|---|
| **Skip video** | Chỉ video bài giảng (`lecture`), không cần AI |
| **Làm bài tập** | Chỉ bài tập (`ungradedAssignment`, `staffGraded`), dùng Gemini / Perplexity để làm và nộp các dạng câu hỏi được hỗ trợ |

Nút **Dừng tác vụ** xuất hiện khi đang chạy. Hai nút tác vụ tạm khóa trong lúc tải hoặc xử lý để tránh chạy trùng. Nhật ký cho biết số video và bài tập sẵn sàng.

Các lựa chọn tác vụ cũ không được dùng bởi hai nút này. Dạng câu hỏi AI được hỗ trợ: một lựa chọn, nhiều lựa chọn, checkbox reflect, text reflect và exact match.

## AI (tùy chọn)

AI chỉ được gọi khi bấm **Làm bài tập**. **Skip video** không cần API key.

1. Mở **Tùy chọn**.
2. Chọn nhà cung cấp, điền tên model khả dụng với tài khoản và API key của bạn.
3. Bấm **Cho phép kết nối AI**; trình duyệt chỉ xin quyền truy cập nhà cung cấp được chọn.
4. Bấm **Làm bài tập**.

Tên model ban đầu giữ theo cấu hình mặc định của bản Python: `gemini-3.1-flash-lite` hoặc `sonar-pro`. Có thể sửa tên model. Bấm **Lưu API key** để lưu riêng cho Gemini hoặc Perplexity trong `chrome.storage.local` của trình duyệt. Mở lại popup sẽ tự điền key đã lưu vào ô mật khẩu. Bấm **Xóa key đã lưu** để xóa key của nhà cung cấp đang chọn. Dữ liệu không đồng bộ lên tài khoản Google/Microsoft và không nằm trong mã nguồn GitHub. Kho lưu trữ extension không mã hóa key; chỉ các trang nội bộ của extension được quyền đọc kho này. Nếu không bấm Lưu, key chỉ tồn tại trong bộ nhớ popup/tác vụ hiện tại.

Khi bật AI, đề/các đáp án và phản hồi chấm điểm của lượt trước được gửi trực tiếp đến nhà cung cấp bạn chọn. API có thể tính phí. Bài tập mặc định tối đa một lượt nộp, có thể chọn hai hoặc ba lượt; mục tiêu điểm là 80% như bản gốc. Nếu Coursera chưa trả kết quả chấm, extension dừng bài đó để tránh nộp lặp.

## Khác biệt so với bản Python

- Dùng phiên đăng nhập ngay trong tab Coursera, không cần đóng trình duyệt để trích xuất cookie.
- Chạy tuần tự, làm mới tiến độ/khóa bài theo đợt và không gửi lại một mục trong cùng lần chạy.
- Dừng toàn bộ khi gặp mất kết nối, lỗi xác thực hoặc giới hạn tốc độ HTTP 401/403/429.
- Không gửi đáp án trống cho loại câu hỏi chưa hỗ trợ; bài đó hiện lỗi để mở thủ công.
- Giữ phản hồi AI trong bộ nhớ của lần chạy, không chuyển dữ liệu cache `gradedData` từ Python.
- Popup chỉ điều khiển tác vụ nền; đóng/mở popup không hủy công việc. Khởi động lại trình duyệt hoặc Reload extension sẽ kết thúc tác vụ.

## Dữ liệu và quyền truy cập

- Quyền `scripting`: gửi yêu cầu API trong tab Coursera để dùng đúng phiên đăng nhập và nguồn yêu cầu.
- Quyền `cookies`: đọc các cookie CSRF của Coursera. Không ghi hay xuất cookie đăng nhập ra file.
- Quyền `storage`: lưu tùy chọn tác vụ/model trên máy; giữ tiến độ, danh sách nội dung và nhật ký trong bộ nhớ phiên trình duyệt để popup khôi phục trạng thái. API key chỉ được lưu cục bộ khi bạn bấm Lưu; không lưu đáp án AI.
- Quyền website bắt buộc chỉ có `https://www.coursera.org/*`. Quyền Gemini / Perplexity là tùy chọn.
- Không có telemetry, backend riêng, mã tải từ xa hay dữ liệu đăng nhập được đóng gói.

## Khi gặp lỗi

- **Không có tab Coursera:** mở trang trên, đăng nhập rồi đóng/mở lại popup.
- **HTTP 401/403:** kiểm tra đăng nhập hoặc trang xác minh của Coursera, rồi tải lại khóa học.
- **HTTP 429:** dừng và thử lại sau khi giới hạn của Coursera kết thúc.
- **Không đọc được khóa học:** kiểm tra slug, quyền đăng ký và mục Nhật ký.
- **AI HTTP 401/403/404/429:** kiểm tra key, tên model, quyền API và hạn mức nhà cung cấp.
- **Đã gửi nhưng chưa hoàn tất:** tải lại tiến độ sau; không suy ra thành công chỉ từ mã HTTP.
- **API/GraphQL thay đổi:** có thể cần cập nhật extension vì các API Coursera này không phải giao diện tích hợp ổn định được bảo đảm.

## Kiểm tra mã

Chỉ người phát triển mới cần Node.js. Không cần cài thư viện để chạy kiểm thử đơn vị:

```text
npm test
```

Kiểm thử trình duyệt dùng profile tách biệt và dữ liệu Coursera giả lập, không dùng tài khoản thật và không nộp bài thật. Chi tiết kết quả trong `VERIFICATION.md`.

## Nguồn

- Mã gốc: [Skipera](https://github.com/serv0id/skipera), MIT; bản chuyển đổi dựa trên mã cài trên máy, giữ giấy phép ở `LICENSE.skipera`.
- [Chrome: network requests và quyền host](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).
- [Gemini: generateContent](https://ai.google.dev/api/generate-content).
- [Perplexity: Sonar API](https://docs.perplexity.ai/api-reference/sonar-post).

Extension này không phải sản phẩm chính thức của Coursera.
