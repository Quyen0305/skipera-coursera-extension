# Skipera Coursera

Tiện ích Chrome/Edge sử dụng Manifest V3, chuyển đổi từ [Skipera](https://github.com/serv0id/skipera) 1.1.0 sang JavaScript. Tiện ích điều khiển tác vụ Coursera qua popup và service worker, sử dụng phiên đăng nhập trong trình duyệt. Không cần Python, máy chủ riêng hoặc bước build.

Phiên bản hiện tại: **1.3.0**. Đây là dự án độc lập, không liên kết chính thức với Coursera.

## Chức năng

| Thao tác | Phạm vi xử lý | Yêu cầu AI |
| --- | --- | --- |
| **Skip video** | Video bài giảng có loại `lecture` | Không |
| **Làm bài tập** | Các mục `ungradedAssignment` và `staffGraded` có dạng câu hỏi được hỗ trợ | Gemini hoặc Perplexity |
| **Dừng tác vụ** | Ngăn các bước tiếp theo của tác vụ đang chạy | Không |

Popup tự nhận khóa học từ URL dạng `https://www.coursera.org/learn/<slug>/...`. Khi có nhiều tab, có thể chọn lại tại **Tùy chọn → Tab Coursera**. API key được lưu riêng theo nhà cung cấp khi người dùng bấm **Lưu API key**.

**Skip video** gửi sự kiện và dữ liệu tiến độ video theo logic của bản Skipera gốc; không phát toàn bộ video trong trình duyệt. **Làm bài tập** có thể lưu và nộp đáp án lên Coursera, không chỉ tạo gợi ý.

## Yêu cầu môi trường

- Chrome hoặc Edge hỗ trợ Manifest V3. Manifest khai báo Chrome tối thiểu **120**; môi trường đã kiểm thử là Chrome for Testing **151**.
- Tài khoản Coursera đã đăng nhập trong cùng hồ sơ trình duyệt và có quyền truy cập khóa học.
- Giữ tab `https://www.coursera.org` đã chọn mở trong khi chạy.
- Để làm bài bằng AI: API key, model khả dụng và hạn mức tại nhà cung cấp tương ứng.
- Để chạy kiểm thử mã nguồn: Node.js **24** và npm. Người chỉ sử dụng extension không cần Node.js.

## Cài đặt

### Lấy mã nguồn

Clone repository bằng tài khoản có quyền truy cập:

```bash
git clone https://github.com/Quyen0305/skipera-coursera-extension.git
cd skipera-coursera-extension
```

Hoặc dùng **Code → Download ZIP** trên GitHub và giải nén vào một thư mục cố định.

### Nạp extension

1. Mở `chrome://extensions` hoặc `edge://extensions`.
2. Bật **Developer mode / Chế độ nhà phát triển**.
3. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
4. Chọn thư mục chứa trực tiếp [manifest.json](manifest.json).
5. Ghim **Skipera Coursera** trên thanh công cụ nếu cần.

Không cần chạy `npm install` hoặc build trước khi nạp. Giữ nguyên thư mục nguồn sau khi cài.

### Cập nhật

Dừng tác vụ hiện tại trước khi cập nhật. Với bản clone từ GitHub, chạy `git pull --ff-only` trong thư mục repository. Với bản ZIP, thay mã nguồn trong thư mục đã cài bằng bản mới. Sau đó bấm **Reload / Tải lại** trên trang quản lý extension.

## Sử dụng

1. Đăng nhập Coursera và mở trang khóa học.
2. Bấm biểu tượng **Skipera**. Popup nhận URL và tải thông tin khóa học khi cần.
3. Kiểm tra slug. Nếu thay URL hoặc tab, bấm **Tải** để cập nhật dữ liệu.
4. Chọn **Skip video** hoặc **Làm bài tập**. Mỗi thời điểm chỉ chạy một tác vụ.
5. Có thể đóng popup; tác vụ tiếp tục trong service worker. Mở lại popup để xem tiến độ, nhật ký hoặc bấm **Dừng tác vụ**.

Bộ đếm **Đã hoàn tất** lấy từ dữ liệu tiến độ của Coursera và tính trên toàn bộ nội dung khóa học. Nhật ký **đã gửi yêu cầu** chỉ xác nhận yêu cầu đã xử lý ở tầng API; không thay thế xác nhận hoàn tất từ Coursera.

Dừng tác vụ không hoàn tác yêu cầu đã gửi. Sau khi dừng, bấm **Tải** để đọc lại trạng thái thực tế.

## Cấu hình AI

Mở **Tùy chọn**, chọn nhà cung cấp và model, rồi bấm **Cho phép kết nối AI**. Nhập API key và bấm **Lưu API key** nếu muốn dùng lại ở lần mở popup sau.

| Nhà cung cấp | Model mặc định trong mã | Endpoint |
| --- | --- | --- |
| Gemini | `gemini-3.1-flash-lite` | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Perplexity | `sonar-pro` | `https://api.perplexity.ai/v1/sonar` |

Tên model có thể chỉnh sửa. Các giá trị mặc định là cấu hình của extension, không bảo đảm model được cấp quyền hoặc còn khả dụng với mọi tài khoản. Lưu key không kiểm tra tính hợp lệ của key; lỗi xác thực được báo khi gọi API.

### Lượt nộp bài

**Lượt / bài** giới hạn số lần nộp cho mỗi bài tập trong một lần chạy: mặc định **1**, tối đa **3**. Khi điểm dưới mục tiêu **80%**, phần xử lý có thể dùng phản hồi chấm điểm để thực hiện lượt tiếp theo, nếu Coursera cho phép.

Giới hạn này không cấp thêm lượt của Coursera. Nếu không còn lượt, dạng câu hỏi chưa hỗ trợ hoặc chưa có phản hồi chấm điểm hợp lệ sau khi nộp, extension dừng xử lý bài đó. Mục tiêu 80% không phải cam kết điểm số hoặc điều kiện đạt của mọi khóa học.

### Dạng câu hỏi hỗ trợ

`MULTIPLE_CHOICE`, `CHECKBOX`, `CHECKBOX_REFLECT`, `TEXT_REFLECT`, `TEXT_EXACT_MATCH`.

Đáp án AI được kiểm tra ID câu hỏi, lựa chọn hợp lệ, số lựa chọn và nội dung bắt buộc trước khi lưu. Phần xử lý không nộp đáp án trống để thay thế một dạng câu hỏi chưa hỗ trợ.

## Kiến trúc

```text
Popup (runner.html / runner.js)
    | chrome.runtime.sendMessage: state, load, start, stop
    v
Service worker (background.js)
    | JobController
    +-- transport.js -- script trong tab Coursera -- Coursera REST / GraphQL
    +-- assessment.js -- llm.js ------------------- Gemini / Perplexity
    +-- chrome.storage.session ------------------- trạng thái tác vụ
```

- **Popup** hiển thị dữ liệu, cấu hình và gửi lệnh; không sở hữu vòng đời tác vụ.
- **Service worker** nhận lệnh, chặn tác vụ chạy trùng và lưu trạng thái để popup đọc lại.
- **Transport** thực thi yêu cầu cùng nguồn trong tab Coursera với `credentials: include`; đọc cookie CSRF và gắn header tương ứng. Không trích xuất cookie đăng nhập ra file.
- **JobController** đọc tiến độ, lọc mục đã hoàn tất hoặc đang khóa, xử lý tuần tự và làm mới dữ liệu sau mỗi đợt. Mỗi mục được thử tối đa một lần trong vòng điều phối; một bài tập có thể có nhiều lượt nộp bên trong lần xử lý đó.
- **AI client** gửi yêu cầu trực tiếp tới nhà cung cấp được chọn. Không có backend trung gian.

Worker gọi API duy trì hoạt động mỗi 20 giây trong thời gian tác vụ đang chạy và dọn timer khi kết thúc. Đây không phải cơ chế khôi phục công việc bền vững: đóng trình duyệt, reload extension hoặc worker bị hệ thống chấm dứt có thể làm gián đoạn tác vụ. Extension không tự phát lại yêu cầu; cần tải lại tiến độ và chạy lại thủ công.

### Cấu trúc mã nguồn

| File / thư mục | Trách nhiệm |
| --- | --- |
| [manifest.json](manifest.json) | Metadata, quyền, popup, service worker và CSP |
| [runner.html](runner.html), [runner.js](runner.js), [style.css](style.css) | Giao diện popup và cấu hình |
| [background.js](background.js) | Nhận lệnh, lưu trạng thái, badge và vòng đời worker |
| [job.js](job.js) | Điều phối tải, chạy và dừng tác vụ |
| [core.js](core.js) | Chuẩn hóa slug, lọc tiến độ, xác thực đáp án và tác vụ cơ bản |
| [transport.js](transport.js) | Giao tiếp REST/GraphQL với tab Coursera |
| [assessment.js](assessment.js) | Đọc câu hỏi, lưu bản nháp, nộp bài và đọc phản hồi |
| [llm.js](llm.js) | Client Gemini và Perplexity |
| [queries.js](queries.js), [materials.js](materials.js) | Truy vấn GraphQL và tham số nội dung khóa học |
| [tests/](tests/) | Kiểm thử bằng `node:test` |
| [VERIFICATION.md](VERIFICATION.md) | Môi trường, kết quả và giới hạn kiểm chứng |

Mã còn giữ các hàm xử lý bài đọc, Coach, widget/LTI và thảo luận từ bản chuyển đổi trước. Hai nút trong giao diện hiện tại không gọi những loại tác vụ này.

## Quyền và lưu trữ dữ liệu

### Quyền trình duyệt

| Quyền | Mục đích |
| --- | --- |
| `storage` | Lưu cấu hình, key do người dùng chọn lưu và trạng thái tác vụ |
| `scripting` | Thực thi yêu cầu API trong tab Coursera được chọn |
| `cookies` | Đọc cookie CSRF của Coursera |
| `https://www.coursera.org/*` | Truy cập tab và API Coursera |
| `https://generativelanguage.googleapis.com/*` | Quyền tùy chọn cho Gemini |
| `https://api.perplexity.ai/*` | Quyền tùy chọn cho Perplexity |

### Nơi lưu dữ liệu

| Vị trí | Nội dung | Thời gian lưu |
| --- | --- | --- |
| `chrome.storage.local`: `popupPrefs` | Nhà cung cấp, model và số lượt nộp | Qua các phiên trình duyệt |
| `chrome.storage.local`: `apiKey_gemini`, `apiKey_perplexity` | API key được lưu bằng nút **Lưu API key** | Đến khi xóa key hoặc dữ liệu extension |
| `chrome.storage.session`: `jobState` | ID người dùng/khóa học, snapshot nội dung, tiến độ và tối đa 100 dòng nhật ký | Bộ nhớ phiên trình duyệt |
| Bộ nhớ tác vụ | Đề bài, đáp án AI và phản hồi các lượt nộp | Trong lần xử lý hiện tại |

`storage.local` được đặt ở mức `TRUSTED_CONTEXTS` để content script không đọc trực tiếp. Key không được đồng bộ bằng `storage.sync`, không ghi vào nhật ký tác vụ và không nằm trong repository. Extension không tự mã hóa key khi lưu; ô mật khẩu chỉ che nội dung trên giao diện.

**Xóa key đã lưu** chỉ xóa key của nhà cung cấp đang chọn. Nếu không bấm Lưu, key chỉ tồn tại trong bộ nhớ popup và tác vụ đã nhận key.

Khi làm bài, nội dung câu hỏi, lựa chọn và phản hồi lượt trước được gửi tới nhà cung cấp AI đã chọn. API key được gửi trong header xác thực tới nhà cung cấp đó. Extension không có telemetry hoặc dịch vụ thu thập dữ liệu riêng.

## Phát triển và kiểm thử

Mã nguồn dùng ES modules, không có dependency npm được khai báo và không cần bundler.

```bash
npm test
```

Lệnh trên chạy `node --test tests/*.test.js`. Bộ kiểm thử hiện có **21 ca**; kết quả đã ghi nhận cho bản 1.3.0 là 21 đạt, 0 lỗi trên Node.js 24.18.0.

Phạm vi gồm lọc nội dung, xác thực đáp án, thứ tự sự kiện video, dừng tác vụ, chống chạy trùng, lỗi HTTP/GraphQL và định dạng yêu cầu AI. Kiểm tra giao diện/lưu key dùng Chromium với dữ liệu giả lập; các script trình duyệt của đợt kiểm tra đó chưa được đóng gói trong repository và không chạy bằng `npm test`.

Chưa xác minh đầu cuối bằng tài khoản Coursera hoặc API key AI thật; chưa kiểm thử trực tiếp trên Edge. Xem [VERIFICATION.md](VERIFICATION.md) trước khi suy rộng kết quả kiểm thử.

## Xử lý sự cố

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Không nhận khóa học | Mở URL `/learn/<slug>/...`, kiểm tra tab trong Tùy chọn rồi bấm Tải |
| Coursera HTTP 401/403 | Kiểm tra phiên đăng nhập và trang xác minh trong tab Coursera; tải lại dữ liệu |
| Coursera HTTP 429 | Chờ giới hạn dịch vụ kết thúc rồi chạy lại |
| AI HTTP 401/403/404/429 | Kiểm tra key, model, quyền sử dụng và hạn mức của nhà cung cấp |
| API không trả JSON hoặc tab mất kết nối | Kiểm tra tab Coursera, tải lại tiến độ trước khi thử tiếp |
| Đã gửi nhưng chưa hoàn tất | Đọc lại tiến độ bằng nút Tải; không suy ra kết quả từ log gửi yêu cầu |
| Thiếu phản hồi chấm điểm | Kiểm tra kết quả trên Coursera; extension không tự nộp lại khi chưa xác định được kết quả |
| Tác vụ bị gián đoạn | Giữ tab Coursera mở, tải lại dữ liệu và chạy lại thủ công |

Yêu cầu Coursera có timeout 30 giây; yêu cầu AI có timeout 120 giây. Lỗi kết nối hoặc Coursera HTTP 401/403/429 dừng toàn bộ tác vụ; lỗi riêng của một mục thường được ghi lại rồi chuyển sang mục tiếp theo. Các API Coursera được sử dụng là API nội bộ và có thể thay đổi độc lập với phiên bản extension.

## Đóng góp

Khi sửa mã, giữ quyền truy cập ở mức cần thiết và bổ sung kiểm thử cho thay đổi hành vi. Trước khi gửi thay đổi, chạy `npm test` và kiểm tra popup bằng dữ liệu thử nghiệm. Khi báo lỗi, ghi phiên bản extension/trình duyệt, bước tái hiện và thông báo lỗi; loại bỏ API key, cookie và thông tin tài khoản khỏi log hoặc ảnh chụp.

## Giấy phép và nguồn gốc

Dự án chuyển đổi từ Skipera 1.1.0, sử dụng mã và truy vấn có giấy phép **MIT**. Thông báo bản quyền gốc được giữ trong [LICENSE.skipera](LICENSE.skipera).

- Dự án gốc: [serv0id/skipera](https://github.com/serv0id/skipera).
- Phiên bản extension được xác định trong [manifest.json](manifest.json) và [package.json](package.json).
