# TLV500 Frontend 🌐

פרונטאנד עבור TLV500 AI Assistant - ממשק משתמש מתקדם לעוזר AI פיננסי.

## 📋 תיאור הפרויקט

פרויקט React מודרני המספק ממשק משתמש אינטואיטיבי לעוזר AI הפיננסי. הפרויקט כולל אינטגרציה מלאה עם Google Sheets, ממשק צ'אט אינטראקטיבי, ותמיכה בהעלאת קבצים.

## ✨ תכונות עיקריות

- 🎨 **ממשק משתמש מודרני** - בנוי עם React ו-Material-UI
- 💬 **צ'אט אינטראקטיבי** - שיחה טבעית עם AI
- 📊 **אינטגרציה עם Google Sheets** - קריאה ועריכה בזמן אמת
- 📄 **העלאת קבצים** - תמיכה ב-PDF, Excel, CSV
- 🔐 **אימות Google OAuth** - התחברות מאובטחת
- 🌍 **תמיכה בעברית** - ממשק מותאם לעברית
- 📱 **עיצוב רספונסיבי** - מותאם לכל המכשירים

## 🛠️ טכנולוגיות

- **React 19.1.0** - ספריית UI מתקדמת
- **Material-UI (MUI) 7.2.0** - רכיבי UI מעוצבים
- **Google APIs** - אינטגרציה עם Google Sheets ו-OAuth
- **React Testing Library** - בדיקות אוטומטיות
- **Create React App** - הגדרת פרויקט מהירה

## 🚀 התקנה והפעלה

### דרישות מוקדמות
- Node.js (גרסה 16 או חדשה יותר)
- npm או yarn
- חשבון Google Cloud עם API keys

### 1. שיבוט הפרויקט
```bash
git clone <repository-url>
cd TLV500-Frontend
```

### 2. התקנת תלותות
```bash
npm install
```

### 3. הגדרת משתני סביבה
העתק את קובץ `.env.example` ל-`.env`:
```bash
cp .env.example .env
```

ערוך את קובץ `.env` והכנס את המפתחות שלך:
```env
REACT_APP_GOOGLE_API_KEY=your_actual_google_api_key
REACT_APP_GOOGLE_CLIENT_ID=your_actual_google_client_id
REACT_APP_BACKEND_URL=http://localhost:5001
```

### 4. הפעלת שרת הפיתוח
```bash
npm start
```

האפליקציה תיפתח ב: `http://localhost:3000`

## 🏗️ בניית הפרויקט לפרודקשן

```bash
npm run build
```

הקבצים יישמרו בתיקיית `build/` ומוכנים לפרסום.

## 🧪 הרצת בדיקות

```bash
# בדיקות יחידה
npm test

# בדיקות עם כיסוי
npm test -- --coverage
```

## 📁 מבנה הפרויקט

```
src/
├── components/          # רכיבי React
│   ├── ChatHistory.js  # ממשק צ'אט
│   └── ...
├── App.js              # רכיב ראשי
├── App.css             # עיצוב ראשי
├── index.js            # נקודת כניסה
└── index.css           # עיצוב כללי

public/
├── index.html          # תבנית HTML
├── manifest.json       # הגדרות PWA
└── ...
```

## ⚙️ הגדרות נוספות

### הגדרת Google APIs
1. עבור ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש או בחר פרויקט קיים
3. הפעל את השירותים הבאים:
   - Google Sheets API
   - Google Drive API
   - Google OAuth2 API
4. צור credentials ועדכן את קובץ `.env`

### הגדרת CORS
ודא שהבקאנד מוגדר לאפשר בקשות מ-`http://localhost:3000`

## 🔧 סקריפטים זמינים

- `npm start` - הפעלת שרת פיתוח
- `npm run build` - בניה לפרודקשן
- `npm test` - הרצת בדיקות
- `npm run eject` - הוצאת הגדרות Create React App (לא הפיך!)

## 🌐 אינטגרציה עם הבקאנד

הפרונטאנד מתקשר עם הבקאנד דרך API calls ל:
- `GET /api/health` - בדיקת תקינות
- `POST /api/chat` - שיחה עם AI
- `POST /api/upload_file` - העלאת קבצים
- `POST /api/select_sheet` - בחירת גיליון
- ועוד...

ודא שהבקאנד רץ על הכתובת המוגדרת ב-`REACT_APP_BACKEND_URL`.

## 🐛 פתרון בעיות נפוצות

### 1. שגיאות CORS
```
Access to fetch at 'http://localhost:5001' blocked by CORS policy
```
**פתרון**: ודא שהבקאנד מוגדר נכון לCORS

### 2. שגיאות Google OAuth
```
Invalid client: no registered origin
```
**פתרון**: הוסף את `http://localhost:3000` ל-authorized origins ב-Google Console

### 3. שגיאות משתני סביבה
```
Process env REACT_APP_GOOGLE_CLIENT_ID is undefined
```
**פתרון**: ודא שקובץ `.env` קיים ומכיל את כל המפתחות הנדרשים

## 📱 תמיכה במכשירים

- **דסקטופ**: Chrome, Firefox, Safari, Edge
- **מובייל**: iOS Safari, Chrome Mobile
- **טאבלט**: תמיכה מלאה

## 🔒 אבטחה

- כל הטוקנים נשמרים ב-localStorage בצורה מאובטחת
- HTTPS נדרש לפרודקשן
- אימות Google OAuth מאובטח
- ולידציה של כל הקלטות המשתמש

## 🤝 תרומה לפרויקט

1. עשה Fork לפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. עשה commit לשינויים (`git commit -m 'Add amazing feature'`)
4. דחף ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📝 רישיון

פרויקט זה מיועד לשימוש פנימי בלבד.

---

**TLV500 Frontend** - הממשק החכם לעוזר הפיננסי שלך! 🚀
