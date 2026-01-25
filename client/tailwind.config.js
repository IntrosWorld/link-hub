/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-green': '#00ff88',
                'brand-black': '#0a0a0a', // Slightly lighter than pure black for depth
                'brand-dark': '#050505',
            }
        },
    },
    plugins: [],
}
