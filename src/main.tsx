import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.jsx"
import "./estilos.css"

const raiz = document.getElementById("root")
if (raiz === null) throw new Error("elemento #root não encontrado")

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>
)
