<div align="center">

# 🌿 EcoScan AI

### Descarte Inteligente com Inteligência Artificial

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Google Vision](https://img.shields.io/badge/Google%20Vision-API-4285F4?style=flat-square&logo=google)](https://cloud.google.com/vision)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

**EcoScan AI** utiliza visão computacional para identificar materiais recicláveis em tempo real, classificando resíduos em 6 categorias e fornecendo instruções precisas de descarte e higienização.

[Demo ao Vivo](#demo-mode) · [Instalação Rápida](#instalação) · [Arquitetura](#arquitetura)

</div>

---

## ✨ Funcionalidades

| Feature | Descrição |
|---------|-----------|
| 📸 **Interface de Câmera** | Acesso nativo à câmera do dispositivo com viewfinder animado |
| 🤖 **Google Vision AI** | Detecção de labels com até 15 resultados por análise |
| ♻️ **6 Categorias** | Plástico · Papel · Vidro · Metal · Orgânico · Rejeito |
| 🧹 **Guia de Higienização** | Instruções passo a passo para preparo antes do descarte |
| 🎨 **Cores de Reciclagem** | Visual code: Amarelo, Azul, Verde, Vermelho, Marrom |
| 🎭 **Modo Demo** | Funciona 100% sem API Key — perfeito para apresentações ao vivo |
| 📱 **Mobile-First** | Design responsivo otimizado para smartphones |
| 💨 **Animações Fluidas** | Framer Motion em todas as transições de estado |

---

## 🏗 Arquitetura

```
ecoscan-ai/
├── frontend/                    # Next.js 14 + App Router
│   └── src/
│       ├── app/                 # Layouts e páginas (App Router)
│       ├── components/
│       │   ├── camera/          # CameraCapture — acesso à câmera
│       │   ├── results/         # ScanResult — exibição dos resultados
│       │   ├── layout/          # Header, Footer
│       │   └── ui/              # Button, Card (componentes base)
│       ├── hooks/
│       │   └── useCamera.ts     # Lógica de câmera encapsulada
│       ├── services/
│       │   └── api.ts           # Chamadas à API (camada de serviço)
│       ├── data/
│       │   └── mockData.ts      # Dados mock para Demo Mode
│       └── types/
│           └── index.ts         # Tipos TypeScript centralizados
│
└── backend/                     # FastAPI + Python
    └── app/
        ├── main.py              # Entry point + CORS + rotas
        ├── api/routes/
        │   └── scan.py          # POST /api/scan
        ├── services/
        │   ├── vision_service.py        # Integração Google Vision API
        │   └── classification_service.py # Lógica de classificação
        └── models/
            └── schemas.py       # Pydantic models (request/response)
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- Python 3.11+
- Conta Google Cloud com Vision API habilitada *(opcional para Demo Mode)*

---

### Backend (FastAPI)

```bash
# 1. Acesse o diretório
cd ecoscan-ai/backend

# 2. Crie e ative o ambiente virtual
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
# .venv\Scripts\activate       # Windows

# 3. Instale dependências
pip install -r requirements.txt

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (ver seção abaixo)

# 5. Inicie o servidor
uvicorn app.main:app --reload --port 8000
```

O backend estará disponível em: http://localhost:8000  
Documentação interativa em: http://localhost:8000/docs

---

### Frontend (Next.js)

```bash
# 1. Acesse o diretório
cd ecoscan-ai/frontend

# 2. Instale dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local se necessário

# 4. Inicie em modo desenvolvimento
npm run dev
```

O frontend estará disponível em: http://localhost:3000

---

## 🔑 Variáveis de Ambiente

### Backend — `backend/.env`

| Variável | Obrigatório | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | ⚠️ Produção | Caminho para o JSON da conta de serviço | `./credentials/service-account.json` |
| `DEMO_MODE` | ✅ | `true` para usar dados mock sem API Key | `false` |
| `ALLOWED_ORIGINS` | ✅ | URLs do frontend permitidas (CORS) | `http://localhost:3000` |
| `PORT` | ✅ | Porta do servidor | `8000` |

### Frontend — `frontend/.env.local`

| Variável | Obrigatório | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | URL base do backend | `http://localhost:8000` |
| `NEXT_PUBLIC_DEMO_MODE` | ✅ | Ativa o banner de Demo Mode no frontend | `false` |

---

## 🎭 Demo Mode

O **Demo Mode** é uma segurança para apresentações ao vivo — funciona **sem nenhuma API Key**.

### Como ativar

**Opção 1 — Via `.env` do backend:**
```env
DEMO_MODE=true
```

**Opção 2 — Via requisição (por item):**
```json
POST /api/scan
{ "image_base64": "...", "demo_mode": true }
```

**Opção 3 — Botão na interface:**  
Com `NEXT_PUBLIC_DEMO_MODE=true` no frontend, um botão ⚡ **Demo Rápido** aparece na tela principal e cicla automaticamente pelas 6 categorias de resíduos.

**Comportamento do Demo:**
- Cicla automaticamente: Plástico → Papel → Vidro → Metal → Orgânico → Rejeito
- Simula delay de processamento para o efeito realista
- Badge "Demo" aparece nos resultados para transparência
- Fallback automático: se a Vision API falhar, o backend retorna dados mock sem travar

---

## 🔧 Configurando a Google Cloud Vision API

```bash
# 1. Habilite a API no Google Cloud Console
# https://console.cloud.google.com/apis/library/vision.googleapis.com

# 2. Crie uma Service Account
# IAM & Admin → Service Accounts → Create Service Account
# Role: "Cloud Vision API User"

# 3. Gere e baixe a chave JSON
mkdir -p backend/credentials
mv ~/Downloads/your-key.json backend/credentials/service-account.json

# 4. Configure no .env
echo "GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json" >> backend/.env
echo "DEMO_MODE=false" >> backend/.env
```

> ⚠️ **Nunca commite o arquivo JSON de credenciais.** O `.gitignore` já está configurado para ignorar `backend/credentials/`.

---

## 📡 API Reference

### `POST /api/scan`

Analisa uma imagem e retorna a classificação do resíduo.

**Request:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "demo_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "demo_mode": false,
  "confidence": 0.94,
  "detected_labels": ["Bottle", "Plastic", "Water bottle"],
  "waste_info": {
    "category": "plastic",
    "label": "Plástico",
    "is_recyclable": true,
    "color_hex": "#EAB308",
    "color_name": "Amarelo",
    "color_tailwind": "yellow",
    "icon_name": "Recycle",
    "cleaning_instructions": ["Esvazie o recipiente", "..."],
    "disposal_instructions": "Deposite na lixeira AMARELA",
    "description": "Material plástico identificado...",
    "eco_tip": "♻️ 1 garrafa PET reciclada..."
  }
}
```

### `GET /health`

```json
{ "status": "ok", "demo_mode": false, "version": "1.0.0" }
```

---

## 🛣 Roadmap (pós-hackathon)

- [ ] **EcoPontos** — Sistema de gamificação: ganhe pontos a cada scan correto
- [ ] **Mapa de Ecopontos** — Localizar pontos de coleta próximos via Google Maps
- [ ] **Histórico de Scans** — Dashboard com impacto ambiental acumulado
- [ ] **PWA** — Instalação como app nativo no celular
- [ ] **Multi-idioma** — Suporte a EN/ES além do PT-BR
- [ ] **Modo Offline** — Modelo leve rodando no edge (TensorFlow Lite)
- [ ] **Notificações** — Lembretes de dia de coleta seletiva

---

## 💡 Diferenciais do Projeto

**Para o pitch, destaque:**

1. **Barreira de entrada zero** — Não requer download de app. Funciona diretamente no navegador mobile com acesso à câmera.

2. **Educação + Ação** — Diferente de apps que só classificam, o EcoScan fornece o *por quê* e o *como*, criando consciência ambiental real.

3. **Fallback inteligente** — Se a IA falhar, o sistema degrada graciosamente para dados curados em vez de travar. Resiliência por design.

4. **Escalável para B2B** — A arquitetura permite integração com prefeituras, cooperativas de reciclagem e condomínios via API.

5. **Stack moderna e auditável** — Clean Architecture facilita onboarding de novos devs e auditoria de código, essencial para projetos de impacto social.

---

## 🤝 Time

Desenvolvido para o **Hackathon - Unifran**.

---

<div align="center">
Feito com 💚 para um planeta mais sustentável
</div>
