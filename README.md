# Feira Viva — Marketplace da Agricultura Familiar e Feiras Livres

MVP desenvolvido para a disciplina **Estágio Curricular Supervisionado — Fábrica de Software I** (iCEV, Engenharia de Software, Turma Ada).
Aluno: Luiz Guilherme Aguiar de Almeida.

O consumidor vê os produtos da agricultura familiar e das feiras livres, monta um carrinho por produtor e
envia o pedido pronto para o **WhatsApp** do produtor. O produtor cadastra perfil, produtos e as feiras
onde vende. O administrador mantém as feiras e modera produtores.

| Camada   | Tecnologia |
|----------|------------|
| Frontend | React 19 + TypeScript + Vite + React Router + Tailwind CSS 4 |
| Backend  | Python 3.12 + FastAPI + Pydantic |
| Dados    | Supabase (PostgreSQL com Row Level Security, Auth e Storage) |
| Testes   | pytest + httpx (API) · Vitest + Testing Library (front) |
| Infra    | Docker, GitHub Actions, Vercel (front), Render (API) |

```
feira-viva/
├── backend/            API FastAPI
│   ├── app/
│   │   ├── routers/        camada HTTP (público, produtor, admin)
│   │   ├── services/       regras de negócio (catálogo, pedidos/WhatsApp)
│   │   ├── repositories/   acesso a dados (Supabase e memória)
│   │   ├── schemas.py      validação de entrada e saída
│   │   └── main.py
│   └── tests/          29 casos de teste (CT01–CT29)
├── frontend/           SPA React
│   └── src/
│       ├── pages/          Vitrine, Feiras, Produtor, Carrinho, Painel, Admin
│       ├── components/
│       └── lib/            api, auth, carrinho (+ testes CT30–CT37)
├── supabase/
│   ├── schema.sql      tabelas, gatilho de perfil, RLS e bucket de fotos
│   └── seed.sql        feiras de exemplo
└── .github/workflows/ci.yml
```

## 1. Rodar em modo demonstração (sem Supabase)

Útil para testar e apresentar: a API usa dados de exemplo em memória e o login mostra contas prontas
(José e Maria, produtores, e um Administrador).

```bash
# API
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload                        # http://localhost:8000/docs

# Front (outro terminal)
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

Sem um arquivo `.env`, os dois sobem em modo demonstração. Os dados somem quando a API reinicia.

## 2. Rodar com Supabase (dados reais)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/schema.sql` e depois `supabase/seed.sql`.
3. Em *Authentication → Providers → Email*, deixe o e-mail habilitado (para testes, pode desligar "Confirm email").
4. Copie as chaves em *Project Settings → API* e crie os arquivos:

`backend/.env`
```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
CORS_ORIGINS=http://localhost:5173
```

`frontend/.env`
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

5. Cadastre-se pela tela "Sou produtor". Para virar admin, rode no SQL Editor:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'seu@email.com');`

> A `service_role` fica **só** no backend. O front usa apenas a `anon key`.

## 3. Testes

```bash
cd backend && pytest -v        # 33 execuções (29 casos, alguns com vários dados de entrada)
cd frontend && npm test        # 8 testes
```

O CI (GitHub Actions) roda lint, testes e build a cada push.

## 4. Endpoints principais

Documentação interativa completa em `http://localhost:8000/docs`.

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `/products?q=&categoria=&feira_id=` | público | Vitrine com busca e filtros |
| GET | `/fairs` · `/fairs/{id}` | público | Feiras e detalhe com produtores e produtos |
| GET | `/producers/{id}` | público | Página do produtor |
| POST | `/orders` | público | Registra o pedido e devolve a mensagem + link `wa.me` |
| GET/PUT | `/me` | produtor | Perfil (WhatsApp normalizado para 55DDNNNNNNNNN) |
| GET/POST/PATCH/DELETE | `/me/products` | produtor | CRUD dos próprios produtos |
| GET/PUT | `/me/fairs` | produtor | Feiras em que vende |
| GET | `/me/orders` | produtor | Pedidos recebidos |
| GET/POST/PATCH | `/admin/fairs` | admin | Gestão de feiras |
| GET/PATCH | `/admin/producers` | admin | Ativar/desativar produtores |

## 5. Decisões de projeto

- **Pedido via WhatsApp, sem pagamento online**: é como o feirante já trabalha; reduz o escopo do MVP e a barreira de adoção.
- **Preço calculado no servidor**: o carrinho envia só `product_id` e quantidade; o total vem do banco (CT18).
- **Um pedido por produtor** (RN05): o carrinho agrupa os itens e cada grupo tem seu botão de envio.
- **Camadas routers → services → repositories**: as regras de negócio são testadas com um repositório em memória, sem depender do Supabase.
- **Produtor só aparece na vitrine com WhatsApp cadastrado** (RN01): sem ele o pedido não teria destino.

## 6. Deploy

- **API (Render)**: novo *Web Service* a partir do repositório, pasta `backend`, ambiente Docker; defina as variáveis do `.env`.
- **Front (Vercel)**: importe o repositório, pasta raiz `frontend`, framework Vite; defina as variáveis `VITE_*` (a `VITE_API_URL` aponta para a URL do Render). Inclua a URL da Vercel em `CORS_ORIGINS` da API.
