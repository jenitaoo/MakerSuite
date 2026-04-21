// src/utils/chunkErrorHandler.ts
/**
 * Handles dynamic chunk loading failures by showing error page
 */

export function setupChunkErrorHandler() {
  let hasError = false;

  // Listen for chunk loading errors
  window.addEventListener('error', (event) => {
    const isChunkError =
      event.message && event.message.includes('Failed to fetch dynamically imported module');

    if (isChunkError && !hasError) {
      hasError = true;
      showChunkErrorPage();
    }
  });

  // Handle unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    const isChunkError =
      event.reason &&
      (event.reason.message?.includes('Failed to fetch') ||
        event.reason.message?.includes('dynamically imported'));

    if (isChunkError && !hasError) {
      hasError = true;
      showChunkErrorPage();
    }
  });
}

function showChunkErrorPage() {
  // Hide the app
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '';
  }

  // Show error page
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(to bottom right, #fdf2f8, #fce7f3, #fed7aa);
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    ">
      <div style="
        text-align: center;
        max-width: 28rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      ">
        <!-- Icon -->
        <div style="
          position: relative;
          display: inline-block;
        ">
          <div style="
            position: absolute;
            inset: 0;
            background: #fbcfe8;
            border-radius: 9999px;
            filter: blur(2rem);
            opacity: 0.5;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          "></div>
          <div style="
            position: relative;
            background: white;
            border-radius: 9999px;
            padding: 2rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            border: 4px solid #fbcfe8;
          ">
            <svg style="
              height: 4rem;
              width: 4rem;
              color: #f472b6;
              animation: bounce 1s infinite;
            " fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M6.34 5.34a9 9 0 1112.32 12.32M6.34 18.66a9 9 0 0112.32-12.32"></path>
            </svg>
          </div>
        </div>

        <!-- Text -->
        <div style="
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        ">
          <h1 style="
            font-size: 2.25rem;
            font-weight: bold;
            color: #171717;
            margin: 0;
          ">Oh no! 😅</h1>
          <p style="
            font-size: 1.125rem;
            color: #525252;
            margin: 0;
          ">
            Looks like we ran into an issue, please refresh!
          </p>
        </div>

        <!-- Button -->
        <button onclick="window.location.href = '/'" style="
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          background: #f472b6;
          color: white;
          border: none;
          border-radius: 9999px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
        " onmouseover="this.style.background = '#ec4899'; this.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15)';"
           onmouseout="this.style.background = '#f472b6'; this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';">
          🔄 Refresh the page
        </button>

        <!-- Helpful text -->
        <p style="
          font-size: 0.75rem;
          color: #78716c;
          margin-top: 2rem;
          margin-bottom: 0;
        ">
          This usually happens after a new update. Your browser cache might be out of sync.
        </p>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.75; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.5rem); }
        }
      </style>
    </div>
  `;
}