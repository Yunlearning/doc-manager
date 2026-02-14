• 步驟一：建立一個具有後端、前端和測試的 Web 應用程式，目標:一個可以上傳、下載的四階文件管理系統。四階文件管理系統可以設定專案區分不同種類的四階文件，例如:iso27001驗證的四階文件、 ISO 9001驗證的四階文件。dashboard可以切換不同的專案，然後透過樹狀圖看到四階文件的結構。

• 步驟二：建立Team Lead（隊長）擔任 Team Lead。這個隊長會分析您的需求，將專案拆解為多個子任務，並分配給其他專門的 Agent。
    ◦ Backend Agent： 負責後端邏輯與 API。
    ◦ Frontend Agent： 負責介面實作。
    ◦ Reviewer Agent： 負責程式碼審查與測試。
• 步驟三：關鍵技術設定

    ◦ Backend：使用postgresql作為資料庫，nodejs+ts+redis搭建後端與處理非同步工作
    ◦ Frontend：使用nextjs+ts+material ui++zod
    ◦ Reviewer：主要使用jest測試
    ◦ 再初始化專案時，請搜尋並建立需要用到的mcp與skills


開發階段接受本地儲存，請在專案資料夾建立儲存用的資料夾
文件的上傳與下載要避免阻塞