# SmartTask Pro — Productivity Dashboard & Gemini AI Integration

A premium, modern SaaS task management application featuring **real Google Gemini AI chat and intelligent task planning**, built with **HTML5, CSS3, vanilla JavaScript**, and a secure local **Node.js server** using the official **`@google/genai` SDK**.

---

## 🔒 Security Architecture (API Key Protection)

- **Zero Client-Side Exposure**: Your `GEMINI_API_KEY` is **never** placed in `index.html`, `app.js`, or any frontend code. The browser never sees or handles your key.
- **Server-Side Mediation**: All AI requests are handled securely by `server.js` running on your local machine, reading `process.env.GEMINI_API_KEY`.
- **Git Protection**: `.env` is listed in `.gitignore` so your private API credentials can never be committed or leaked.
- **Data Minimization**: The app only sends task titles and priorities when you explicitly trigger an AI feature (breakdown, priority check, or schedule).

---

## 🚀 Step-by-Step Local Setup & Execution Guide

### Step 1: Configure Your Gemini API Key

1. If you haven't already, generate a free API key at **[Google AI Studio](https://aistudio.google.com/)**.
2. In the project folder (`H:\softwear devolopment` or `H:\softwear devolopment\SmartTaskApp`), create a file named `.env` by copying `.env.example`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Open `.env` in any text editor (Notepad, VS Code, etc.) and replace the placeholder:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere123456789
   PORT=3000
   ```
4. Save the `.env` file.

> **Alternative: Setting as a Windows Environment Variable (Optional)**
> If you prefer not to keep a `.env` file, you can set an environment variable in PowerShell:
> ```powershell
> $env:GEMINI_API_KEY="AIzaSyYourActualKeyHere123456789"
> ```
> Or in Windows Command Prompt:
> ```cmd
> set GEMINI_API_KEY=AIzaSyYourActualKeyHere123456789
> ```

---

### Step 2: Start the Local Server

Open PowerShell in `H:\softwear devolopment`:

```powershell
npm start
```

You will see:
```text
=======================================================
🚀 SmartTask Pro server running at: http://localhost:3000
🤖 Gemini AI Status: ACTIVE (Key Configured)
⚡ Model: gemini-3.8-flash
=======================================================
```

---

### Step 3: Open the App in Your Browser

Open your web browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🤖 How to Test Every Gemini AI Feature

### 1. Test Gemini Productivity Chat
1. In the sidebar, click **Gemini AI** (or the AI sparkle tab).
2. The top status pill will display **"🟢 Gemini Active (gemini-3.8-flash)"**.
3. Click one of the quick prompt chips (e.g., *"🎯 Prioritize my queue"* or *"⚡ Beat procrastination"*), or type a question in the chat input (e.g., *"How do I plan a realistic 4-hour work session today?"*).
4. **Expected Result**: Gemini streams a tailored, practical productivity response formatted with clean bullet points.

### 2. Test AI Task Breakdown (With User Confirmation)
1. In the **Dashboard** or **My Tasks** view, look at any task item in your list.
2. Click the **✨ (Sparkle)** button next to the pencil and trash icons.
3. A toast will notify you that Gemini is breaking down the task.
4. The **AI Task Breakdown Modal** will appear showing 3 to 5 concrete subtasks suggested by Gemini, each with a priority tag and checkbox.
5. Review the proposed steps, uncheck any you don't need, and click **"Add Selected Steps to Tasks"**.
6. **Expected Result**: The selected subtasks are immediately added as real tasks to your queue, saved in `localStorage`, and the counters update.

### 3. Test AI Queue Prioritization (With User Confirmation)
1. Go to the **Gemini AI** view in the sidebar.
2. In the right column under *Prioritize & Optimize Tasks*, click **"Analyze Pending Queue"**.
3. The **AI Priority Analysis Modal** will display:
   - An executive workload assessment summary.
   - A highlighted **Immediate Focus** recommendation.
   - A checklist of proposed priority adjustments (e.g., upgrading an urgent task to 🔥 High).
4. Select the adjustments you agree with and click **"Apply Selected Changes"**.
5. **Expected Result**: Your task list updates immediately with the confirmed priority levels.

### 4. Test AI Daily Schedule Planner
1. In the **Gemini AI** view, click **"Generate Today's Schedule"**.
2. The **Proposed Daily Schedule Modal** will display a realistic time-blocked timeline (e.g., 9:00 AM - 10:30 AM: Focus block) based on your pending tasks.
3. Click **"Copy Schedule"** to copy the timeline to your clipboard.

### 5. Test Offline & Fallback Resilience
- If you stop the server or run without an API key, the app gracefully falls back to local mode, shows a friendly alert, and allows full manual task management (Add, Edit, Complete, Delete, Filters, Sort, Export/Import) with zero data loss.

---

## 🌐 Deploying to Vercel (Production)

This project is pre-configured for one-click deployment on [Vercel](https://vercel.com):

1. **Push your code to GitHub** (following the instructions provided).
2. Go to **[vercel.com](https://vercel.com)** and log in with your GitHub account.
3. Click **"Add New..."** -> **"Project"**.
4. Import your `smart-task-manager` repository.
5. In **Environment Variables**, add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key from AI Studio
6. Click **Deploy**. Vercel will build and host your app with global CDN caching and serverless API endpoints.
