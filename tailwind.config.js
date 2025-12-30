/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0b",
                foreground: "#e1e2e4",
                surface: "#141417",
                border: "#39393c",
                muted: "#71717a",
                risk: {
                    low: "#3b82f6",
                    medium: "#f59e0b",
                    high: "#f97316",
                    critical: "#ef4444",
                },
                health: {
                    good: "#10b981",
                    stable: "#3b82f6",
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
