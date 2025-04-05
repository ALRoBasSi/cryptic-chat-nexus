
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// إضافة ألوان الهاكر
				hacker: {
					DEFAULT: '#0ACF83',
					dark: '#0A8F5C',
					light: '#5BFCB0',
					bg: '#111',
					'dark-bg': '#0D0D0D',
					'light-bg': '#1A1A1A',
					'text': '#CCC',
				},
				cyber: {
					blue: '#00BFFF',
					pink: '#FF00FF',
					yellow: '#FFFF00',
				}
			},
			fontFamily: {
				'sans': ['Cairo', 'sans-serif'],
				'mono': ['"Source Code Pro"', 'Consolas', 'monospace'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'text-glitch': {
					'0%, 100%': { transform: 'translate(0)' },
					'10%': { transform: 'translate(-2px, 2px)' },
					'20%': { transform: 'translate(2px, -2px)' },
					'30%': { transform: 'translate(-2px, 2px)' },
					'40%': { transform: 'translate(2px, -2px)' },
					'50%': { transform: 'translate(-2px, 2px)' },
					'60%': { transform: 'translate(2px, -2px)' },
					'70%': { transform: 'translate(-2px, 2px)' },
					'80%': { transform: 'translate(2px, -2px)' },
					'90%': { transform: 'translate(-2px, 2px)' }
				},
				'matrix-effect': {
					'0%': { transform: 'translateY(-100%)', opacity: '0' },
					'30%': { opacity: '1' },
					'100%': { transform: 'translateY(100%)', opacity: '0' }
				},
				'pulse-neon': {
					'0%, 100%': { 
						textShadow: '0 0 4px #0ACF83, 0 0 8px #0ACF83, 0 0 12px #0ACF83',
						boxShadow: '0 0 4px #0ACF83'
					},
					'50%': { 
						textShadow: '0 0 8px #0ACF83, 0 0 16px #0ACF83, 0 0 24px #0ACF83',
						boxShadow: '0 0 8px #0ACF83'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'text-glitch': 'text-glitch 0.5s ease-in-out infinite',
				'matrix-effect': 'matrix-effect 10s linear infinite',
				'pulse-neon': 'pulse-neon 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
