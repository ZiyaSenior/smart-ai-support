# Smart AI Customer Support Assistant

Bu layihə müştəri dəstəyi üçün AI əsaslı web tətbiqinin başlanğıc strukturunu saxlayır.

## Açıqlama
- Backend: Flask API
- Frontend: React + Vite (layihə strukturu hazırdır)
- Konfiqurasiya: `.env` faylı vasitəsilə API açarları
- İlk mərhələ: repo konfiqurasiyası və başlanğıc faylları

## Başlanğıc Quraşdırma
1. Python virtual mühiti yaradın və aktiv edin:

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Asılılıqları quraşdırın:

```bash
pip install -r requirements.txt
```

3. `.env.example` faylını kopyalayın və `OPENROUTER_API_KEY` ilə doldurun:

```bash
copy .env.example .env
```

4. Backend-i işə salın:

```bash
python backend\app.py
```
> Əgər modul import xətası alınsa, bu komandanı istifadə edin:
>
> ```bash
> python -m backend.app
> ```
>
> Bu, `backend` paketini paket kimi işlədərək modul import problemlərini aradan qaldırır.

5. Frontend-i yerli fayl kimi açın və ya sadə HTTP serverdən istifadə edin:

```bash
cd frontend
python -m http.server 8000
```

Sonra browserda açın:

```bash
http://127.0.0.1:8000
```

> Əgər `npm` və Vite ilə bağlı problem varsa, bu statik HTML/JS versiyası terminaldan asılı deyil və birbaşa işləyir.
dev1
ziyaa