# Feira Viva — Marketplace da Agricultura Familiar e Feiras Livres

MVP desenvolvido para a disciplina **Estágio Curricular Supervisionado — Fábrica de Software I** (iCEV, Engenharia de Software, Turma Ada).
Aluno: Luiz Guilherme Aguiar de Almeida.

**No ar:** [feira-viva-ruby.vercel.app](https://feira-viva-ruby.vercel.app) · API: [feira-viva-api.vercel.app/docs](https://feira-viva-api.vercel.app/docs)

O consumidor vê os produtos da agricultura familiar e das feiras livres, monta um carrinho por produtor e
envia o pedido pronto para o **WhatsApp** do produtor. O produtor cadastra perfil, produtos e as feiras
onde vende. O administrador mantém as feiras e modera produtores.

| Camada   | Tecnologia |
|----------|------------|
| Frontend | React 19 + TypeScript + Vite + React Router + Tailwind CSS 4 |
| Backend  | Python 3.12 + FastAPI + Pydantic |
| Dados    | PostgreSQL no Neon (psycopg 3); login próprio com bcrypt + JWT; fotos no banco |
| Testes   | pytest + httpx (API) · Vitest + Testing Library (front) |
| Infra    | Vercel (front e API), Neon (banco), GitHub Actions (CI), Docker (opcional) |

```
feira-viva/
├── backend/            API FastAPI
│   ├── app/
│   │   ├── routers/        camada HTTP (público, produtor, admin)
│   │   ├── services/       regras de negócio (login, catálogo, pedidos/WhatsApp)
│   │   ├── repositories/   acesso a dados (PostgreSQL e memória)
│   │   ├── db/schema.sql   tabelas (aplicadas automaticamente ao subir)
│   │   ├── schemas.py      validação de entrada e saída
│   │   └── main.py
│   └── tests/          casos CT01–CT29 e CT38–CT46
├── frontend/           SPA React
│   └── src/
│       ├── pages/          Vitrine, Feiras, Produtor, Carrinho, Painel, Admin
│       ├── components/
│       └── lib/            api, auth, carrinho (+ testes CT30–CT37)
└── .github/workflows/ci.yml
```

## 1. Rodar em modo demonstração (sem banco)

A API usa dados de exemplo em memória. Contas prontas: `jose@demo.com`, `maria@demo.com` (produtores)
e `admin@demo.com`, todas com a senha `feiraviva`.

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

## 2. Rodar com banco PostgreSQL (Neon)

1. Crie um projeto grátis em [neon.com](https://neon.com) e copie a *connection string*.
2. Crie `backend/.env` (veja `backend/.env.example`):

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=um-segredo-longo-e-aleatorio
ADMIN_EMAILS=seu@email.com
CORS_ORIGINS=http://localhost:5173
```

3. Suba a API: ela cria as tabelas e as feiras iniciais sozinha (`app/db/schema.sql`).
4. Cadastre-se pela tela "Sou produtor". Quem se cadastra com um e-mail listado em `ADMIN_EMAILS` vira administrador.

> `DATABASE_URL` e `JWT_SECRET` são segredos: ficam só no `.env` (ignorado pelo Git) e nas variáveis de ambiente da hospedagem.

## 3. Testes

```bash
cd backend && pytest -v        # em memória
TEST_DATABASE_URL=postgresql://... pytest -v   # também contra um PostgreSQL vazio (o CI faz isso)
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
| POST | `/auth/cadastro` · `/auth/entrar` | público | Cria conta / faz login, devolve token JWT |
| POST | `/me/fotos` · GET `/images/{id}` | produtor / público | Envia e exibe fotos |
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
- **Camadas routers → services → repositories**: as regras de negócio são testadas com um repositório em memória, sem depender do banco.
- **Produtor só aparece na vitrine com WhatsApp cadastrado** (RN01): sem ele o pedido não teria destino.
- **Login próprio** (bcrypt + JWT): senhas nunca são guardadas em texto; a mesma mensagem de erro para e-mail inexistente e senha errada não revela quem tem conta.
- **Fotos redimensionadas no navegador** (até 1200 px, JPEG) antes do envio: uma foto de celular de 5 MB vira cerca de 100–300 KB no banco.

## 6. Deploy (Vercel + Neon)

Dois projetos na Vercel ligados a este repositório:

| Projeto | Pasta raiz | Variáveis |
|---|---|---|
| API | `backend` (FastAPI detectado em `app/main.py`) | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAILS`, `CORS_ORIGINS` |
| Front | `frontend` (Vite) | `VITE_API_URL` = URL da API |

Cada push na branch `main` publica as duas partes automaticamente.
