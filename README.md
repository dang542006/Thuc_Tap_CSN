# TechStore — hướng dẫn cài đặt và chạy website trên Windows

## Tổng quan dự án cho CV/portfolio

**TechStore** là dự án thương mại điện tử về laptop, PC, linh kiện và phụ kiện. Dự án tách giao diện web, API xử lý nghiệp vụ và database MySQL; hướng dẫn cài đặt cho Windows ở dưới đây dùng database local riêng cho từng thành viên.

**Công nghệ:** React 18, Vite 6 và React Router; Node.js, Express 5; Prisma 6 và MySQL; JWT và bcrypt cho đăng nhập, phân quyền và lưu mật khẩu dạng hash.

**Phần đã triển khai:** duyệt/tìm kiếm/lọc sản phẩm, chi tiết sản phẩm, tài khoản khách hàng, yêu thích, giỏ hàng và đơn hàng; khu vực Admin có kiểm tra quyền tại backend; Build PC lấy linh kiện và giá từ database, kiểm tra socket/kích thước/nguồn và báo `COMPATIBLE`, `INCOMPATIBLE` hoặc `UNKNOWN` tùy dữ liệu có thể xác minh.

**Trạng thái theo lần rà soát ngày 2026-10-29:** backend có 42 bài test đạt và frontend production build thành công. Lần kiểm tra catalog ghi nhận 31 sản phẩm tổng cộng, trong đó có 14 linh kiện cho Build PC; mục tiêu catalog 120–150 linh kiện chưa đạt. Tư vấn sản phẩm đang dùng quy tắc theo catalog; OpenAI chưa được cấu hình. VNPAY chỉ ở môi trường sandbox. Giá và tồn kho local có thể là dữ liệu mẫu.

**Ảnh giao diện:** hiện chưa có ảnh chụp website được kiểm tra trực tiếp trong repository. Kiểm thử hiển thị bằng browser trên desktop/tablet/mobile được ghi là `NOT TESTED`; không coi contact sheet ảnh sản phẩm là ảnh chụp giao diện. Xem [review N11 phần 1–2](docs/n11-medium-part1-2-review.md) để biết chi tiết và các giới hạn.

> **Đã cài project rồi, chỉ tắt máy?** Mở nhanh phần [Cách chạy nhanh sau khi đã cài đặt](#3-cách-chạy-nhanh-sau-khi-đã-cài-đặt). Bật MySQL nếu cần, rồi chạy backend và frontend trong hai Terminal. Không cài lại thư viện, tạo database mới hoặc chạy seed hằng ngày.

## 1. TechStore là gì?

TechStore là website bán laptop, linh kiện và phụ kiện máy tính, có trang dành cho khách mua hàng và trang quản trị.

- **Frontend** là giao diện mở trong trình duyệt.
- **Backend** là chương trình xử lý dữ liệu ở phía máy chủ.
- **API** là đường giao tiếp giữa giao diện và backend.
- **Database** là nơi lưu sản phẩm, tài khoản, giỏ hàng và đơn hàng; dự án dùng MySQL.
- **Migration** là lệnh cập nhật cấu trúc bảng trong database, không phải lệnh nhập lại catalog.

## 2. Chức năng và giới hạn hiện tại

Dự án có duyệt/tìm kiếm/lọc sản phẩm, chi tiết sản phẩm, đăng ký/đăng nhập, hồ sơ, yêu thích, giỏ hàng, checkout COD, tích hợp VNPAY sandbox, theo dõi đơn hàng, khu vực Admin, Build PC và tư vấn sản phẩm dựa trên catalog.

Build PC tính giá từ database và có thể báo COMPATIBLE, INCOMPATIBLE hoặc UNKNOWN khi thiếu thông số. Catalog linh kiện hiện còn giới hạn. Tư vấn dùng quy tắc khi chưa cấu hình OpenAI; khi đó đây không phải phản hồi từ mô hình AI. Giá và tồn kho local có thể là dữ liệu mẫu. Ảnh được phân loại theo nguồn; ảnh render chính thức hoặc ảnh nhà bán lẻ không đồng nghĩa với ảnh chụp thật. Xem [review N11 phần 1–2](docs/n11-medium-part1-2-review.md) để biết trạng thái kiểm thử mới nhất.

## 3. Cách chạy nhanh sau khi đã cài đặt

Khi tắt máy, các tiến trình backend và frontend dừng lại nhưng database MySQL và dữ liệu thường vẫn còn. Nếu cần bật MySQL: mở Start, tìm **Services**, tìm dịch vụ MySQL (thường có tên MySQL80), rồi chọn **Start** nếu dịch vụ đang dừng. Nếu dùng XAMPP/Docker, bật MySQL trong công cụ đó. Mở project trong VS Code, sau đó chọn **Terminal → New Terminal** hai lần khi thư mục gốc project đang mở.

**Terminal 1 — Backend**
Chạy trong thư mục backend/:

~~~powershell
Set-Location .\backend
npm run dev
~~~

Để Terminal này mở. Kết quả mong đợi là backend lắng nghe cổng 5000 và kết nối MySQL thành công.

**Terminal 2 — Frontend**
Chạy trong thư mục frontend/:

~~~powershell
Set-Location .\frontend
npm run dev
~~~

Để Terminal này mở. Mở website tại [http://localhost:5173](http://localhost:5173).

API backend ở http://localhost:5000/api; kiểm tra nhanh tại [http://localhost:5000/api/health](http://localhost:5000/api/health). Nếu database cũ còn nguyên, **không tạo database khác, không chạy seed, không chạy lại bootstrap Admin chỉ để khởi động**.

## 4. Mỗi thành viên dùng database nào?

### Cách mặc định: database local riêng cho mỗi người

Mỗi thành viên chạy MySQL trên máy mình và tạo database local riêng (có thể cùng đặt tên thuc_tap_csn). Mỗi người có backend/.env, frontend/.env và tài khoản Admin local riêng. Mọi người dùng cùng source code và cùng quy trình khởi tạo, nhưng tài khoản, đơn hàng, giỏ hàng và tồn kho **không tự đồng bộ** giữa các máy.

Không cần IP hoặc mật khẩu MySQL của máy người khác. localhost luôn chỉ máy đang chạy trình duyệt/backend của chính thành viên đó.

### Nếu nhóm muốn cùng dùng một bộ dữ liệu

Khi đó nhóm phải triển khai backend và MySQL trên một máy chủ được quản lý chung. Các frontend phải đặt VITE_API_URL trỏ tới địa chỉ backend đã triển khai, và backend phải cho phép origin của các frontend qua CORS_ORIGINS. DATABASE_URL chỉ đặt trên backend của máy chủ.

Không đưa thông tin database, mật khẩu, JWT secret hoặc API key vào Git/README. Không mở cổng MySQL trực tiếp ra Internet. README này không tạo hoặc triển khai máy chủ dùng chung.

## 5. Trước khi thành viên clone project

Remote Git đang cấu hình trong bản project này là:

~~~text
https://github.com/dang542006/Thuc_Tap_CSN.git
~~~

Tuy nhiên, git clone chỉ tải những gì đã được commit và push lên repository. Bản working tree hiện có các thay đổi chưa commit; backend/uploads/catalog/ hiện có 51 file ảnh nhưng chưa file nào được Git theo dõi. Một số script nhập catalog và manifest ảnh cũng đang là file mới/chưa được theo dõi.

**Trước khi nhóm clone để dùng đầy đủ phiên bản hiện tại, người quản lý repository cần commit và push mã nguồn, migration, script, manifest và ảnh cần thiết lên branch chung.** Không commit backend/.env, frontend/.env, mật khẩu hay backup local. Nếu chưa biết branch chứa phiên bản mới nhất, hỏi người quản lý nhóm thay vì đoán.

## 6. Cài project lần đầu trên máy thành viên

Làm lần lượt các bước dưới đây một lần cho mỗi máy Windows mới.

### Bước 1 — Cài và kiểm tra công cụ

Cài:

1. **Node.js 22 LTS, phiên bản 22.12 trở lên**; npm 10 trở lên được cài cùng Node.js. Đây là nhánh tương thích với Prisma 6 đang dùng trong project. Có thể tải từ [trang Node.js chính thức](https://nodejs.org/en/download/).
2. **MySQL Server 8.0 trở lên**; MySQL 8.4 LTS phù hợp cho cài đặt mới. MySQL Workbench là công cụ giao diện để tạo database; có thể dùng công cụ tương đương. Tải tại [MySQL Community Downloads](https://dev.mysql.com/downloads/).
3. **Visual Studio Code** để mở source và các cửa sổ Terminal.
4. **Git for Windows** nếu chưa có, tải tại [git-scm.com](https://git-scm.com/download/win).

Mở PowerShell và kiểm tra:

~~~powershell
node --version
npm --version
git --version
mysql --version
~~~

Kết quả mong đợi: mỗi lệnh in ra phiên bản. Nếu Windows báo không nhận diện node, npm hoặc git, cài công cụ đó rồi đóng và mở lại VS Code. Nếu mysql không có trong PATH, vẫn có thể kiểm tra MySQL bằng MySQL Workbench hoặc Services.

### Bước 2 — Tải source bằng Git

Mở PowerShell ở thư mục bạn muốn lưu project (ví dụ Documents của chính bạn) rồi chạy:

~~~powershell
git clone https://github.com/dang542006/Thuc_Tap_CSN.git
Set-Location .\BookShop
~~~

Nếu nhóm cung cấp branch riêng, sau khi clone chạy git switch TEN_BRANCH với đúng tên branch nhóm cung cấp. Không tự đoán tên branch. Đảm bảo maintainer đã push các thay đổi và ảnh cần thiết như ghi ở phần 5.

### Bước 3 — Mở source trong VS Code

Trong PowerShell ở thư mục vừa clone, chạy:

~~~powershell
code .
~~~

Nếu lệnh code chưa được bật, mở VS Code bằng Start, chọn **File → Open Folder...**, rồi chọn thư mục BookShop.

Các thư mục chính:

- frontend/: giao diện và các trang website.
- backend/: API, xử lý nghiệp vụ và xác thực.
- backend/prisma/: cấu trúc database và các migration.
- backend/scripts/: script nhập catalog, kiểm tra và bootstrap Admin.
- backend/uploads/catalog/: ảnh catalog được backend phục vụ.
- docs/: tài liệu, review yêu cầu và manifest ảnh.
- N11-medium.docx: tài liệu yêu cầu dự án.

Trong VS Code chọn **Terminal → New Terminal** để mở PowerShell tại thư mục project.

### Bước 4 — Tạo database MySQL local của bạn

1. Mở MySQL Workbench và kết nối tới MySQL local vừa cài.
2. Chọn **File → New Query Tab**.
3. Chạy SQL sau để tạo database riêng trên máy này:

~~~sql
CREATE DATABASE thuc_tap_csn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
~~~

4. Nhấn nút tia sét để chạy. Database thuc_tap_csn sẽ xuất hiện trong danh sách Schemas.

Nếu MySQL Workbench báo database đã tồn tại, không xóa database đó. Nếu database này có dữ liệu trước đó, dừng ở đây và dùng quy trình cho database hiện hữu; không chạy seed theo các bước phía dưới.

### Bước 5 — Tạo và điền file môi trường

File .env chứa cấu hình riêng trên máy, như địa chỉ database. Tạo file từ mẫu tại thư mục gốc project:

~~~powershell
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\frontend\.env.example .\frontend\.env
~~~

Mở backend/.env trong VS Code và sửa các giá trị sau:

Nếu lệnh Copy-Item báo file đã tồn tại, đừng ghi đè: mở file .env hiện có và chỉ sửa giá trị cần thiết.

- **DATABASE_URL**: kết nối tới MySQL local của bạn. Ví dụ với user MySQL root và cổng mặc định 3306:

~~~dotenv
DATABASE_URL=mysql://root:MAT_KHAU_MYSQL_CUA_BAN@127.0.0.1:3306/thuc_tap_csn
~~~

Thay phần mật khẩu bằng mật khẩu MySQL bạn vừa cài. Nếu mật khẩu có ký tự đặc biệt như @, mã hóa ký tự trong URL (ví dụ @ thành %40). Không dùng địa chỉ/mật khẩu MySQL của thành viên khác.

- **JWT_SECRET**: chuỗi bí mật dùng để ký phiên đăng nhập; cần ít nhất 32 ký tự. Có thể tạo ngẫu nhiên bằng PowerShell, lệnh sau chép giá trị vào clipboard mà không in ra:

~~~powershell
$randomBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
[Convert]::ToBase64String($randomBytes) | Set-Clipboard
Write-Host "Đã chép chuỗi ngẫu nhiên; dán vào JWT_SECRET trong backend/.env."
~~~

- **PORT**: backend mặc định chạy cổng 5000; giữ nguyên nếu không có chương trình khác dùng cổng này.
- **CORS_ORIGINS**: danh sách website được phép gọi backend. Khi frontend chạy mặc định, giữ các giá trị http://localhost:5173 và http://127.0.0.1:5173 có sẵn trong mẫu.
- **FRONTEND_URL**: mặc định http://localhost:5173; đổi nếu frontend của bạn dùng URL khác.
- **BOOKSHOP_SEED_PASSWORD**: đặt mật khẩu local dài ít nhất 12 ký tự cho các tài khoản demo mà seed tạo. Không dùng mật khẩu đang dùng ở nơi khác.
- **ADMIN_BOOTSTRAP_EMAIL**: email Admin local; mỗi người có thể dùng email riêng, hoặc dùng cùng tên email vì database của mỗi người độc lập.
- **ADMIN_BOOTSTRAP_PASSWORD**: mật khẩu Admin local riêng. Có thể để trống; script bootstrap sẽ tự tạo mật khẩu mạnh và lưu trong .env của máy đó.

Trong frontend/.env, kiểm tra:

~~~dotenv
VITE_API_URL=http://localhost:5000/api
~~~

Giữ giá trị này nếu PORT=5000. Nếu đổi PORT, sửa cổng trong VITE_API_URL, CORS_ORIGINS và VNPAY_RETURN_URL cho khớp. Không đặt JWT secret, mật khẩu, VNPAY secret hoặc OpenAI key trong frontend/.env hay biến VITE_*.

VNPAY và OpenAI là tùy chọn. Có thể để trống các giá trị tương ứng trong backend/.env; website vẫn chạy với COD và tư vấn theo quy tắc.

### Bước 6 — Cài thư viện frontend và backend

Mở Terminal thứ nhất trong VS Code, từ thư mục gốc chạy:

~~~powershell
Set-Location .\backend
npm ci
~~~

Kết quả mong đợi: npm cài xong dependency backend mà không báo lỗi.

Mở **Terminal → New Terminal** thứ hai, tại thư mục gốc chạy:

~~~powershell
Set-Location .\frontend
npm ci
~~~

Kết quả mong đợi: npm cài xong dependency frontend. Không cần cài lại nếu thư viện đã có và lockfile không đổi.

### Bước 7 — Tạo Prisma Client và áp dụng migration

Trong Terminal backend (đang ở thư mục backend/ từ bước cài thư viện), chạy:

~~~powershell
npm run prisma:generate
npm run prisma:deploy
~~~

Nếu Terminal không ở backend/, trước hết kiểm tra bằng Get-Location rồi chuyển tới backend/ bằng Set-Location .\backend khi đang đứng ở thư mục gốc project.

Kết quả mong đợi: Prisma Client được tạo và các migration trong project được áp dụng vào database local vừa tạo. Nếu migration báo bảng đã tồn tại hoặc database không rỗng, không xóa bảng; dừng lại và hỏi maintainer cách xử lý database đó.

### Bước 8 — Nạp dữ liệu ban đầu cho database mới

**Chỉ làm bước này khi database vừa tạo đang rỗng.** Trong Terminal backend chạy:

~~~powershell
npm run db:seed
npm run catalog:expand
npm run catalog:pc-builder:expand
~~~

Các lệnh làm gì:

- **db:seed** tạo danh mục cơ sở, một số sản phẩm, tài khoản demo, hạng thành viên và các đơn hàng mẫu. Script cũng đồng bộ các tài khoản mẫu đã định danh và ngừng một số bản ghi legacy cụ thể. Vì vậy chỉ chạy trên database mới/rỗng, không chạy để khởi động website.
- **catalog:expand** thêm sản phẩm máy tính còn thiếu theo slug. Script yêu cầu các file ảnh catalog đã có trong source; nếu báo thiếu ảnh, kiểm tra maintainer đã commit và push backend/uploads/catalog/ chưa.
- **catalog:pc-builder:expand** thêm các linh kiện Build PC còn thiếu, theo SKU/slug; có thể cần internet để tải ảnh nếu file cục bộ chưa có. Script báo số lượng tạo/bỏ qua.

Hai script catalog được thiết kế để chạy lại mà không nhân bản SKU/slug đã tồn tại. Dù vậy, không cần chạy lại chúng hằng ngày. Không có lệnh đặt lại tồn kho trong quy trình chạy website.

### Bước 9 — Tạo Admin local riêng

Sau khi dữ liệu ban đầu đã có, trong Terminal backend chạy:

~~~powershell
npm run admin:bootstrap
~~~

Script dùng ADMIN_BOOTSTRAP_EMAIL và ADMIN_BOOTSTRAP_PASSWORD trong backend/.env, tạo hoặc đồng bộ đúng tài khoản local đó và hash mật khẩu bằng cơ chế của dự án. Nếu password để trống, script tạo chuỗi ngẫu nhiên và ghi vào .env local. Mỗi thành viên có thể tự đặt mật khẩu riêng; không gửi file .env cho nhóm.

Đường dẫn đăng nhập: http://localhost:5173/login. Sau khi đăng nhập bằng Admin, mở http://localhost:5173/admin.

### Bước 10 — Chạy website

**Terminal 1 — Backend** (thư mục backend/):

~~~powershell
npm run dev
~~~

Chờ thông báo server lắng nghe cổng 5000 và MySQL đã kết nối; giữ Terminal mở.

**Terminal 2 — Frontend** (thư mục frontend/):

~~~powershell
npm run dev
~~~

Chờ Vite hiển thị URL rồi mở [http://localhost:5173](http://localhost:5173). Trang API kiểm tra sức khỏe là [http://localhost:5000/api/health](http://localhost:5000/api/health), danh mục sản phẩm là [http://localhost:5173/books](http://localhost:5173/books), Build PC là [http://localhost:5173/pc-builder](http://localhost:5173/pc-builder).

## 7. Kiểm tra website và chạy test

Trong lúc backend và MySQL đang chạy, mở PowerShell khác và kiểm tra các cổng:

~~~powershell
Test-NetConnection 127.0.0.1 -Port 5000
Test-NetConnection 127.0.0.1 -Port 5173
Test-NetConnection 127.0.0.1 -Port 3306
~~~

TcpTestSucceeded : True nghĩa là cổng nhận được kết nối. Cổng MySQL có thể khác 3306 nếu bạn đã đổi cấu hình.

Chạy test backend trong Terminal riêng:

~~~powershell
Set-Location .\backend
npm test
~~~

Tạo bản build frontend để kiểm tra:

~~~powershell
Set-Location .\frontend
npm run build
~~~

Đây là lệnh kiểm tra; để chạy website khi đang phát triển vẫn dùng npm run dev.

## 8. Xử lý lỗi thường gặp

### Clone xong nhưng thiếu thư viện

**Dấu hiệu:** báo không tìm thấy package, lệnh npm lỗi dependency.
**Nguyên nhân thường gặp:** chưa chạy npm ci hoặc chạy sai thư mục.
**Cách kiểm tra:** chạy Get-Location; kiểm tra Terminal đang ở backend/ hay frontend/.
**Cách sửa:** chạy npm ci trong đúng thư mục. Với lỗi Prisma, từ backend/ chạy thêm npm run prisma:generate.

### Chạy lệnh ở sai thư mục

**Dấu hiệu:** báo không tìm thấy package.json hoặc script không tồn tại.
**Nguyên nhân thường gặp:** dự án không có package.json ở thư mục gốc.
**Cách kiểm tra:** chạy Get-Location.
**Cách sửa:** lệnh backend chạy ở backend/; lệnh giao diện chạy ở frontend/. Dùng Set-Location ..\backend hoặc Set-Location ..\frontend nếu đang ở thư mục con tương ứng.

### MySQL chưa chạy hoặc sai mật khẩu

**Dấu hiệu:** backend báo P1001, Can't reach database server hoặc Access denied.
**Nguyên nhân thường gặp:** MySQL service đang dừng hoặc DATABASE_URL sai.
**Cách kiểm tra:** mở Services và xem MySQL có trạng thái Running không; thử kết nối trong Workbench; dùng Test-NetConnection 127.0.0.1 -Port 3306.
**Cách sửa:** bật MySQL và sửa URL trong backend/.env theo MySQL local. Không thay database cũ bằng database mới để né lỗi.

### Database chưa được tạo hoặc chưa có migration

**Dấu hiệu:** lỗi không tìm thấy database/bảng hoặc Prisma báo migration pending.
**Nguyên nhân thường gặp:** chưa tạo database local hoặc chưa áp dụng migration.
**Cách kiểm tra:** xác nhận database xuất hiện trong Workbench và kiểm tra thông báo backend.
**Cách sửa:** với database mới/rỗng, chạy npm run prisma:deploy từ backend/. Nếu database đã có bảng hoặc dữ liệu, dừng lại và hỏi maintainer; không xóa database, không chạy full seed.

### Website mở được nhưng báo Network error

**Dấu hiệu:** trang hiện nhưng sản phẩm, login hoặc giỏ hàng không tải.
**Nguyên nhân thường gặp:** backend không chạy, API URL sai hoặc CORS không cho phép frontend.
**Cách kiểm tra:** mở http://localhost:5000/api/health; xem URL frontend mà Vite in ra; kiểm tra VITE_API_URL trong frontend/.env và CORS_ORIGINS trong backend/.env.
**Cách sửa:** chạy backend; đặt VITE_API_URL=http://localhost:5000/api; bảo đảm CORS_ORIGINS có đúng origin frontend, thường là http://localhost:5173. Nếu Vite chuyển sang cổng khác, thêm origin mới vào CORS_ORIGINS. Sau khi đổi .env, dừng và chạy lại tiến trình frontend/backend tương ứng.

### Cổng 5000 hoặc 5173 đang được sử dụng

**Dấu hiệu:** backend báo EADDRINUSE hoặc Vite nói cổng bận.
**Nguyên nhân thường gặp:** server cũ còn chạy trong cửa sổ Terminal khác.
**Cách kiểm tra:** xem các Terminal VS Code; có thể xem tiến trình đang giữ cổng:

~~~powershell
Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
~~~

**Cách sửa:** nếu đó là Terminal của bạn, nhấn Ctrl+C trong Terminal đó rồi khởi động lại một lần. Vite có thể in ra cổng thay thế; khi đó mở đúng URL nó hiển thị. Không kết thúc tiến trình không rõ nguồn gốc.

### Ảnh sản phẩm bị lỗi hoặc thiếu

**Dấu hiệu:** ô ảnh trống, ảnh lỗi hoặc script catalog:expand báo Missing or empty product image.
**Nguyên nhân thường gặp:** ảnh không có trong clone, đường dẫn trong manifest sai, hoặc các file ảnh chưa được push lên Git.
**Cách kiểm tra:** xác nhận file được yêu cầu có trong backend/uploads/catalog/ và đối chiếu docs/product-image-sources.json.
**Cách sửa:** hỏi maintainer kiểm tra commit chứa ảnh/manifest; không gán ảnh của sản phẩm khác để che lỗi. Chạy lại import catalog chỉ sau khi có đầy đủ file cần thiết.

### Không đăng nhập được Admin

**Dấu hiệu:** đăng nhập bị từ chối hoặc /admin chuyển về trang login.
**Nguyên nhân thường gặp:** Admin local chưa được bootstrap, email khác cấu hình hoặc mật khẩu vừa đổi nhưng hash trong MySQL chưa được đồng bộ.
**Cách kiểm tra:** kiểm tra ADMIN_BOOTSTRAP_EMAIL trong backend/.env; khi cả backend và frontend đang chạy, từ Terminal backend chạy npm run admin:verify.
**Cách sửa:** database mới thì chạy npm run admin:bootstrap. Nếu tài khoản Admin đã tồn tại và bạn vừa đổi password trong .env, chạy npm run admin:reset-password. Không chạy seed để sửa login và không gửi mật khẩu cho maintainer.

### Không mở được sản phẩm hoặc Build PC

**Dấu hiệu:** /books hoặc /pc-builder hiện lỗi, danh sách rỗng bất thường hoặc báo không tải được linh kiện.
**Nguyên nhân thường gặp:** API/backend/MySQL chưa chạy, migration chưa áp dụng, hoặc database mới chưa nạp catalog.
**Cách kiểm tra:** mở /api/health; xem backend Terminal; kiểm tra /api/categories và /api/pc-builder/catalog tại http://localhost:5000.
**Cách sửa:** khởi động lại MySQL/backend. Nếu database mới chưa có dữ liệu, hoàn thành bước 8. Nếu database đã dùng trước đây, không chạy seed; kiểm tra API/log hoặc hỏi maintainer.

## 9. Quy tắc an toàn và Admin

- backend/.env và frontend/.env là file local; .gitignore ở thư mục gốc và các thư mục con loại chúng khỏi Git. Hai file .env.example là mẫu không chứa thông tin bí mật. Ảnh catalog được phép theo dõi trong Git; ảnh do người dùng tải lên và backup local thì không.
- Mỗi thành viên tạo Admin local riêng bằng npm run admin:bootstrap. Không dùng chung password và không đưa password/API key/JWT secret vào chat nhóm hoặc repository.
- Đổi password Admin đã có: sửa ADMIN_BOOTSTRAP_PASSWORD, sau đó chạy npm run admin:reset-password từ backend/.
- npm run admin:verify kiểm tra đăng nhập và quyền API; cần cả backend lẫn frontend đang chạy.
- Không chạy npm run db:seed trên database đang sử dụng. Seed tạo dữ liệu demo, gồm đơn hàng mẫu, và đồng bộ một số tài khoản demo đã định danh.
- Không xóa database hay mở cổng MySQL trực tiếp ra Internet để khắc phục kết nối.

## 10. Cấu trúc project và tài liệu

~~~text
backend/
  prisma/         Schema MySQL, migrations và seed
  src/            API, xác thực, quyền truy cập và nghiệp vụ
  scripts/        Catalog, kiểm tra dữ liệu và bootstrap Admin
  test/           Backend tests
  uploads/        Ảnh được backend phục vụ
frontend/
  src/pages/      Trang cửa hàng và Admin
  src/components/ Thành phần giao diện dùng chung
  src/services/   Các lệnh gọi API
  src/styles/     CSS
docs/               API, database, quy tắc nghiệp vụ, review và manifest ảnh
N11-medium.docx     Tài liệu yêu cầu dự án
~~~

Tài liệu chi tiết: [review N11 phần 1–2](docs/n11-medium-part1-2-review.md), [thiết lập](docs/setup.md), [API](docs/api.md), [database](docs/database.md), [Admin API](backend/ADMIN_API.md), [manifest ảnh](docs/product-image-sources.json).
