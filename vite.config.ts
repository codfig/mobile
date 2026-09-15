import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o dist/ funciona em qualquer subpasta, inclusive
  // hospedado em Pages ou aberto direto do sistema de arquivos
  base: "./",
  server: { host: true, port: 5173 }
})
