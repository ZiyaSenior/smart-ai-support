# Smart AI Customer Support Assistant — Plan

Bu sənəd layihənin web tətbiqinə çevrilməsi üçün addım-addım planı izah edir.

Layihənin məqsədi
- AI vasitəsilə şirkətlərin müştəri dəstəyini avtomatlaşdırmaq; istifadəçi sualını qəbul edib AI modelinə göndərmək, cavabı almaq və göstərmək.

MVP (Minimal Viable Product) xülasəsi
- Backend: `Flask` API (Python)
- Frontend: `React` (Vite və ya Create React App)
- Chat tarixi: başlanğıc üçün yaddaşda (in-memory)
- AI provayder: istifadəçinin göstərəcəyi HTTP-based API (məsələn, "qroq api")

Addım-addım Plan
1) Layihə strukturu və konfiqurasiya (Scaffold)
   - `backend/` və `frontend/` qovluqları yaradılacaq
   - `.gitignore`, `.env.example`, `README.md` yenilənəcək
   - `requirements.txt` və `frontend/package.json` placeholder-lar əlavə ediləcək

2) Backend — Flask
   - `backend/app.py` daxilində REST endpoint-lər hazırlamaq:
     - `POST /api/chat` — istifadəçi mesajını qəbul edir, AI provayderə göndərir, cavabı saxlayıb qaytarır
     - `GET /api/history` — cari sessiyanın/konversasiyanın tarixçəsini qaytarır
   - AI-proxy funksiyası: `ai_client.send_message(prompt)` — bütün AI çağırışlarını buradan etmək
   - Konfiqurasiya: `.env` içində `AI_API_KEY`, `AI_API_URL` və s.
   - Error handling: `try/except` ilə düzgün cavab və status kodlar qaytarılacaq

3) Frontend — React
   - Sadə Chat UI: mesaj listi, mətn inputu, göndər düyməsi, yüklənmə göstəricisi
   - `history` komandasını dəstəkləmək: istifadəçi `history` yazanda frontend `GET /api/history` çağırır və nəticəni göstərir
   - Backend ilə Axios/fetch vasitəsilə ünsiyyət

4) Lokal test və sınaq
   - Backend üçün kiçik unit testlər (məsələn `pytest`) və manual test ssenariləri
   - Lokal işlətmə qaydası README-də göstəriləcək

5) Deploy (Məcburi deyil — MVP sonra)
   - `Dockerfile` və deployment təlimatları (Render / Vercel / Fly)
   - CI: GitHub Actions üçün sadə iş axını (lint və test)

6) Gələcək inkişaflar
   - Davamlılıq üçün DB əlavə etmək (Postgres/SQLite)
   - Admin panel və autentifikasiya
   - WhatsApp/Telegram inteqrasiyası və səsli köməkçi
   - Multi-language dəstək (AZ + EN)

Doğrulama və lokal işlətmə (quick start)
1. Python virtualenv yaratmaq və asılılıqları quraşdırmaq

```bash
python -m venv .venv
.venv\\Scripts\\activate   # Windows
pip install -r requirements.txt
```

2. Backend-i işlətmək

```bash
cd backend
set FLASK_APP=app.py     # Windows PowerShell
flask run
```

3. Frontend-i işlətmək

```bash
cd frontend
npm install
npm run dev
```

4. Manual test
- Frontendi aç və mesaj göndər: "What is your refund policy?"
- Nəticədə AI-dən peşəkar cavab gözlə

Qərarlar / Təsdiqlər (Assumptions)
- Backend: Flask seçildi
- Frontend: React seçildi
- Chat tarixçəsi: in-memory olaraq saxlanılacaq (MVP üçün)
- AI provayder: HTTP API istifadə ediləcək; sonradan Gemini və ya başqa provayderə çevirmək asandır

Növbəti addım
- Sənin təsdiqini aldıqdan sonra `backend/app.py`-ni scaffold edəcəm və `requirements.txt` əlavə edəcəm.
