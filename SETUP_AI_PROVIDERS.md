# Guia de Configuração: OpenAI e Google Gemini

Este guia ajuda a configurar o suporte a OpenAI e Google Gemini para geração de sugestões de receitas.

## 📋 Arquivo `.env`

Copie as variáveis do `.env.example` e preencha com suas chaves. Exemplo:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-3.5-turbo
AI_SUGGESTION_COUNT=8
```

---

## 🔑 OpenAI

### 1. Obter API Key

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Vá para **API keys** (no menu esquerdo)
4. Clique em **Create new secret key**
5. Copie a chave gerada

### 2. Configurar `.env`

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...  # Cole sua chave aqui
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. Testar

```bash
node ./script/test-openai.js
```

Você deve ver:
```
✅ Resposta recebida com sucesso!
✅ JSON válido encontrado com X receita(s)
```

---

## 🤖 Google Gemini

### 1. Obter API Key e Endpoint

**Opção A: Google Cloud (Recomendado para produção)**

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a API: Generative Language API
4. Crie credenciais: Service Account
5. Gere uma chave JSON
6. Use o endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`

**Opção B: Gemini API (Mais simples)**

1. Acesse [aistudio.google.com](https://aistudio.google.com)
2. Clique em **Get API Key**
3. Crie uma nova API key
4. Use o endpoint: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent`

### 2. Configurar `.env`

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...  # Cole sua API key aqui
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent
```

### 3. Testar

```bash
node ./scripts/test-gemini.js
```

Você deve ver:
```
✅ Resposta recebida com sucesso!
✅ JSON válido encontrado com X receita(s)
```

---

## 🔄 Alternar entre provedores

Basta mudar `AI_PROVIDER` no `.env`:

```env
AI_PROVIDER=openai   # Use OpenAI
# ou
AI_PROVIDER=gemini   # Use Gemini
```

E reiniciar o servidor:

```bash
npm start
```

---

## 🐛 Troubleshooting

### OpenAI retorna erro 401

- Verifique se a chave `OPENAI_API_KEY` está correta
- Confirme que a chave começa com `sk-`
- Verifique se a chave não expirou no dashboard da OpenAI

### Gemini retorna erro 404

- Confirme que `GEMINI_API_URL` está correto
- Use a URL correta do modelo:
  - `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent`
  - Ou: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`

### Gemini retorna erro 403

- Verifique se `GEMINI_API_KEY` está correta
- Confirme que a chave começa com `AIzaSy`
- Verifique se a API foi ativada no projeto Google Cloud

### Nenhuma sugestão IA exibida

- Verifique o console do servidor para erros
- Confirme que `.env` foi salvo e o servidor foi reiniciado
- Teste manualmente: `node test-openai-v2.js` ou `node test-gemini.js`

---

## 📊 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `AI_PROVIDER` | `openai` ou `gemini` | `openai` |
| `OPENAI_API_KEY` | Chave da API OpenAI | (obrigatória se usar OpenAI) |
| `OPENAI_MODEL` | Modelo OpenAI | `gpt-3.5-turbo` |
| `GEMINI_API_KEY` | Chave da API Gemini | (obrigatória se usar Gemini) |
| `GEMINI_API_URL` | URL do endpoint Gemini | (obrigatória se usar Gemini) |
| `AI_SUGGESTION_COUNT` | Número de sugestões iniciais | `8` |

---

## ✅ Checklist de Configuração

- [ ] Arquivo `.env` criado (cópia de `.env.example`)
- [ ] `AI_PROVIDER` definido (`openai` ou `gemini`)
- [ ] API Key obtida e configurada
- [ ] URL do Gemini configurada (se usando Gemini)
- [ ] Teste executado com sucesso (`node test-openai-v2.js` ou `node test-gemini.js`)
- [ ] Servidor reiniciado (`npm start`)
- [ ] Sugestões IA aparecem na página inicial

