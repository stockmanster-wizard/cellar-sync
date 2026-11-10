# CellarSync AI 🍷✨

CellarSync AI is a modern, AI-powered wine cellar inventory and management application designed for wine enthusiasts and collectors. It combines sleek design with advanced visual recognition and tracking capabilities to effortlessly manage your collection.

## Features

- **AI-Powered Label Recognition:** Snap or upload wine labels to instantly extract producer, varietal, vintage, region, and tasting notes using Google Gemini.
- **Visual Rack & Storage Management:** Interactive grid views and custom shelving to track exact bottle coordinates in your cellar.
- **Inventory Tracking:** Real-time stock levels, maturity/drinking windows, varietal badges, ratings, and consumption history.
- **Auditing & History:** Comprehensive logging of bottle additions, movements, and consumption logs.
- **Cloud Sync & Auth:** Firebase integration for secure data storage and authentication.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **Backend / API:** Node.js, Express, tsx, Firebase Firestore / Auth
- **AI Integration:** `@google/genai` (Google Gemini SDK)

## Getting Started

### Prerequisites

- Node.js (v18+)
- Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/stockmanster-wizard/cellar-sync.git
   cd cellar-sync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to supply your `GEMINI_API_KEY`.

   *(Optional)* If using Firebase, copy `firebase-applet-config.example.json` to `firebase-applet-config.json` and fill in your Firebase project credentials.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000` (or the port specified in your console).

## License

MIT
