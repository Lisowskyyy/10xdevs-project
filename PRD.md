# Veranima - Product Requirements Document (PRD)

## 1. Wprowadzenie
**Veranima** to "Cyfrowa Świątynia" – aplikacja well-being wspierająca zdrowie psychiczne poprzez rytuały cyfrowe, journaling wspomagany przez AI oraz techniki uwalniania emocji.

### Cel Produktu
Stworzenie bezpiecznej przestrzeni cyfrowej, która pomaga użytkownikom w codziennym oczyszczaniu umysłu, praktyce wdzięczności i medytacji, wykorzystując nowoczesne technologie (AI) w służbie spokoju ducha.

---

## 2. Kluczowe Funkcjonalności (MVP)

### Uwierzytelnianie i Profil (Auth)
- Rejestracja i logowanie (Email/Hasło) przez Supabase Auth.
- Personalizacja profilu (Imię, Nazwisko).
- Zarządzanie kontem (Aktualizacja danych, Usuwanie konta zgodnie z RODO).

### Dziennik Wdzięczności z AI (AI Journal)
- Codzienne wpisy wdzięczności.
- **AI Feedback:** Analiza wpisu przez OpenAI, dostarczająca spersonalizowaną refleksję lub afirmację.
- Historia wpisów (CRUD: Przeglądanie i usuwanie wpisów).

### Moduł Dracarys (Rytuał Ognia)
- Interaktywny interfejs do wpisywania negatywnych myśli.
- Wizualna i dźwiękowa metafora "spalania" problemu (transmutacja).
- Brak zapisu "spalonych" myśli w bazie danych (prywatność i symboliczne oczyszczenie).

### Timer Medytacyjny
- Prosty timer do sesji oddechowych.
- Śledzenie postępów (liczba minut/sesji w profilu).

---

## 3. Stack Technologiczny
- **Frontend:** Astro (SSR Mode), Tailwind CSS (UI & Animations).
- **Backend:** Vercel (Hosting & Serverless Functions).
- **Baza Danych:** Supabase (PostgreSQL, Auth, Row Level Security).
- **AI:** OpenAI API (GPT-4o/mini) do analizy sentymentu.
- **Testy:** Playwright (E2E).
- **CI/CD:** GitHub Actions.

---

## 4. Architektura i Bezpieczeństwo
- **RLS (Row Level Security):** Każdy użytkownik ma dostęp wyłącznie do swoich danych.
- **Secure Cookies:** Sesja obsługiwana po stronie serwera (HttpOnly cookies).
- **Service Role:** Operacje krytyczne (np. usuwanie konta) wykonywane w bezpiecznym środowisku serwerowym.

---

## 5. Status Projektu
- **Wdrożono:** Wersja 1.0 (MVP) dostępna publicznie.
- **Testy:** Przechodzą (E2E Login & Home).
- **Infrastruktura:** Skonfigurowane CI/CD.
