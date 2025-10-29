from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sua-chave-secreta-super-segura-2024')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========== MODELS ==========

class UserRole(BaseModel):
    nome: str
    permissoes: dict  # {"tela": ["visualizar", "criar", "editar", "excluir"]}

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    nome: str
    senha_hash: str
    papel: str  # admin, vendedor, gerente
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    email: EmailStr
    nome: str
    senha: str
    papel: str = "vendedor"

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Log(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ip: str
    user_id: str
    user_nome: str
    tela: str
    acao: str  # login, logout, inserir, editar, deletar, erro
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    detalhes: Optional[dict] = None

class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf_cnpj: str
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[dict] = None
    observacoes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClienteCreate(BaseModel):
    nome: str
    cpf_cnpj: str
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[dict] = None
    observacoes: Optional[str] = None

class Fornecedor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    razao_social: str
    cnpj: str
    ie: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[dict] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FornecedorCreate(BaseModel):
    razao_social: str
    cnpj: str
    ie: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[dict] = None

class Marca(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MarcaCreate(BaseModel):
    nome: str
    ativo: bool = True

class Categoria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True

class Subcategoria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    categoria_id: str
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SubcategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria_id: str
    ativo: bool = True

class Produto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    nome: str
    marca_id: Optional[str] = None
    categoria_id: Optional[str] = None
    subcategoria_id: Optional[str] = None
    unidade: str = "UN"
    preco_custo: float
    preco_venda: float
    estoque_atual: int = 0
    estoque_minimo: int = 0
    estoque_maximo: int = 0
    fotos: Optional[List[str]] = None
    descricao: Optional[str] = None
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProdutoCreate(BaseModel):
    sku: str
    nome: str
    marca_id: Optional[str] = None
    categoria_id: Optional[str] = None
    subcategoria_id: Optional[str] = None
    unidade: str = "UN"
    preco_custo: float
    preco_venda: float
    estoque_minimo: int = 0
    estoque_maximo: int = 0
    fotos: Optional[List[str]] = None
    descricao: Optional[str] = None
    ativo: bool = True

class NotaFiscal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    serie: str
    fornecedor_id: str
    data_emissao: str
    valor_total: float
    xml: Optional[str] = None
    itens: List[dict]  # [{"produto_id": "", "quantidade": 0, "preco_unitario": 0}]
    confirmado: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NotaFiscalCreate(BaseModel):
    numero: str
    serie: str
    fornecedor_id: str
    data_emissao: str
    valor_total: float
    xml: Optional[str] = None
    itens: List[dict]

class MovimentacaoEstoque(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    tipo: str  # entrada, saida
    quantidade: int
    referencia_tipo: str  # nota_fiscal, orcamento, venda, devolucao
    referencia_id: str
    user_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Orcamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: str
    itens: List[dict]  # [{"produto_id": "", "quantidade": 0, "preco_unitario": 0}]
    desconto: float = 0
    frete: float = 0
    total: float
    status: str = "aberto"  # aberto, vendido, devolvido, cancelado
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrcamentoCreate(BaseModel):
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    frete: float = 0

class Venda(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    frete: float = 0
    total: float
    forma_pagamento: str  # cartao, pix, boleto, dinheiro
    orcamento_id: Optional[str] = None
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VendaCreate(BaseModel):
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    frete: float = 0
    forma_pagamento: str
    orcamento_id: Optional[str] = None

# ========== AUTH UTILS ==========

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

async def log_action(ip: str, user_id: str, user_nome: str, tela: str, acao: str, detalhes: dict = None):
    log = Log(ip=ip, user_id=user_id, user_nome=user_nome, tela=tela, acao=acao, detalhes=detalhes)
    await db.logs.insert_one(log.model_dump())

# ========== AUTH ROUTES ==========

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user = User(
        email=user_data.email,
        nome=user_data.nome,
        senha_hash=hash_password(user_data.senha),
        papel=user_data.papel
    )
    await db.users.insert_one(user.model_dump())
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.senha, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário inativo")
    
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    
    await log_action(
        ip="0.0.0.0",
        user_id=user["id"],
        user_nome=user["nome"],
        tela="login",
        acao="login"
    )
    
    user_data = {k: v for k, v in user.items() if k != "senha_hash"}
    
    return Token(access_token=access_token, token_type="bearer", user=user_data)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = {k: v for k, v in current_user.items() if k != "senha_hash"}
    return user_data

# ========== CLIENTES ==========

@api_router.get("/clientes", response_model=List[Cliente])
async def get_clientes(current_user: dict = Depends(get_current_user)):
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    return clientes

@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente = Cliente(**cliente_data.model_dump())
    await db.clientes.insert_one(cliente.model_dump())
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="clientes",
        acao="criar",
        detalhes={"cliente_id": cliente.id}
    )
    
    return cliente

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    updated_data = cliente_data.model_dump()
    updated_data["id"] = cliente_id
    updated_data["created_at"] = existing["created_at"]
    
    await db.clientes.replace_one({"id": cliente_id}, updated_data)
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="clientes",
        acao="editar",
        detalhes={"cliente_id": cliente_id}
    )
    
    return Cliente(**updated_data)

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="clientes",
        acao="deletar",
        detalhes={"cliente_id": cliente_id}
    )
    
    return {"message": "Cliente deletado com sucesso"}

# ========== FORNECEDORES ==========

@api_router.get("/fornecedores", response_model=List[Fornecedor])
async def get_fornecedores(current_user: dict = Depends(get_current_user)):
    fornecedores = await db.fornecedores.find({}, {"_id": 0}).to_list(1000)
    return fornecedores

@api_router.post("/fornecedores", response_model=Fornecedor)
async def create_fornecedor(fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = Fornecedor(**fornecedor_data.model_dump())
    await db.fornecedores.insert_one(fornecedor.model_dump())
    return fornecedor

# ========== MARCAS ==========

@api_router.get("/marcas", response_model=List[Marca])
async def get_marcas(current_user: dict = Depends(get_current_user)):
    marcas = await db.marcas.find({}, {"_id": 0}).to_list(1000)
    return marcas

@api_router.post("/marcas", response_model=Marca)
async def create_marca(marca_data: MarcaCreate, current_user: dict = Depends(get_current_user)):
    marca = Marca(**marca_data.model_dump())
    await db.marcas.insert_one(marca.model_dump())
    return marca

# ========== CATEGORIAS ==========

@api_router.get("/categorias", response_model=List[Categoria])
async def get_categorias(current_user: dict = Depends(get_current_user)):
    categorias = await db.categorias.find({}, {"_id": 0}).to_list(1000)
    return categorias

@api_router.post("/categorias", response_model=Categoria)
async def create_categoria(categoria_data: CategoriaCreate, current_user: dict = Depends(get_current_user)):
    categoria = Categoria(**categoria_data.model_dump())
    await db.categorias.insert_one(categoria.model_dump())
    return categoria

# ========== SUBCATEGORIAS ==========

@api_router.get("/subcategorias", response_model=List[Subcategoria])
async def get_subcategorias(current_user: dict = Depends(get_current_user)):
    subcategorias = await db.subcategorias.find({}, {"_id": 0}).to_list(1000)
    return subcategorias

@api_router.post("/subcategorias", response_model=Subcategoria)
async def create_subcategoria(subcategoria_data: SubcategoriaCreate, current_user: dict = Depends(get_current_user)):
    subcategoria = Subcategoria(**subcategoria_data.model_dump())
    await db.subcategorias.insert_one(subcategoria.model_dump())
    return subcategoria

# ========== PRODUTOS ==========

@api_router.get("/produtos", response_model=List[Produto])
async def get_produtos(current_user: dict = Depends(get_current_user)):
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    return produtos

@api_router.post("/produtos", response_model=Produto)
async def create_produto(produto_data: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    produto = Produto(**produto_data.model_dump())
    await db.produtos.insert_one(produto.model_dump())
    return produto

@api_router.put("/produtos/{produto_id}", response_model=Produto)
async def update_produto(produto_id: str, produto_data: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    updated_data = produto_data.model_dump()
    updated_data["id"] = produto_id
    updated_data["estoque_atual"] = existing.get("estoque_atual", 0)
    updated_data["created_at"] = existing["created_at"]
    
    await db.produtos.replace_one({"id": produto_id}, updated_data)
    return Produto(**updated_data)

# ========== ESTOQUE ==========

@api_router.get("/estoque/alertas")
async def get_alertas_estoque(current_user: dict = Depends(get_current_user)):
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    
    alertas_minimo = [p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]]
    alertas_maximo = [p for p in produtos if p["estoque_atual"] >= p["estoque_maximo"]]
    
    return {
        "alertas_minimo": alertas_minimo,
        "alertas_maximo": alertas_maximo
    }

@api_router.get("/estoque/movimentacoes")
async def get_movimentacoes(current_user: dict = Depends(get_current_user)):
    movimentacoes = await db.movimentacoes_estoque.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return movimentacoes

# ========== NOTAS FISCAIS ==========

@api_router.get("/notas-fiscais", response_model=List[NotaFiscal])
async def get_notas_fiscais(current_user: dict = Depends(get_current_user)):
    notas = await db.notas_fiscais.find({}, {"_id": 0}).to_list(1000)
    return notas

@api_router.post("/notas-fiscais", response_model=NotaFiscal)
async def create_nota_fiscal(nota_data: NotaFiscalCreate, current_user: dict = Depends(get_current_user)):
    nota = NotaFiscal(**nota_data.model_dump())
    await db.notas_fiscais.insert_one(nota.model_dump())
    return nota

@api_router.post("/notas-fiscais/{nota_id}/confirmar")
async def confirmar_nota_fiscal(nota_id: str, current_user: dict = Depends(get_current_user)):
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    if nota["confirmado"]:
        raise HTTPException(status_code=400, detail="Nota fiscal já confirmada")
    
    # Atualizar estoque
    for item in nota["itens"]:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] + item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
            
            # Registrar movimentação
            movimentacao = MovimentacaoEstoque(
                produto_id=item["produto_id"],
                tipo="entrada",
                quantidade=item["quantidade"],
                referencia_tipo="nota_fiscal",
                referencia_id=nota_id,
                user_id=current_user["id"]
            )
            await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": {"confirmado": True}}
    )
    
    return {"message": "Nota fiscal confirmada e estoque atualizado"}

# ========== ORÇAMENTOS ==========

@api_router.get("/orcamentos", response_model=List[Orcamento])
async def get_orcamentos(current_user: dict = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).to_list(1000)
    return orcamentos

@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orcamento_data: OrcamentoCreate, current_user: dict = Depends(get_current_user)):
    total = sum(item["quantidade"] * item["preco_unitario"] for item in orcamento_data.itens)
    total = total - orcamento_data.desconto + orcamento_data.frete
    
    orcamento = Orcamento(
        cliente_id=orcamento_data.cliente_id,
        itens=orcamento_data.itens,
        desconto=orcamento_data.desconto,
        frete=orcamento_data.frete,
        total=total,
        user_id=current_user["id"]
    )
    
    await db.orcamentos.insert_one(orcamento.model_dump())
    
    # Reservar estoque
    for item in orcamento.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] - item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
    
    return orcamento

@api_router.post("/orcamentos/{orcamento_id}/converter-venda")
async def converter_orcamento_venda(orcamento_id: str, forma_pagamento: str, current_user: dict = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento["status"] != "aberto":
        raise HTTPException(status_code=400, detail="Orçamento não está aberto")
    
    # Criar venda
    venda = Venda(
        cliente_id=orcamento["cliente_id"],
        itens=orcamento["itens"],
        desconto=orcamento["desconto"],
        frete=orcamento["frete"],
        total=orcamento["total"],
        forma_pagamento=forma_pagamento,
        orcamento_id=orcamento_id,
        user_id=current_user["id"]
    )
    
    await db.vendas.insert_one(venda.model_dump())
    
    # Registrar movimentações
    for item in venda.itens:
        movimentacao = MovimentacaoEstoque(
            produto_id=item["produto_id"],
            tipo="saida",
            quantidade=item["quantidade"],
            referencia_tipo="venda",
            referencia_id=venda.id,
            user_id=current_user["id"]
        )
        await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Atualizar status do orçamento
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {"status": "vendido"}}
    )
    
    return {"message": "Orçamento convertido em venda", "venda_id": venda.id}

@api_router.post("/orcamentos/{orcamento_id}/devolver")
async def devolver_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento["status"] != "aberto":
        raise HTTPException(status_code=400, detail="Orçamento não está aberto")
    
    # Devolver estoque
    for item in orcamento["itens"]:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] + item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {"status": "devolvido"}}
    )
    
    return {"message": "Itens devolvidos ao estoque"}

# ========== VENDAS ==========

@api_router.get("/vendas", response_model=List[Venda])
async def get_vendas(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
    return vendas

@api_router.post("/vendas", response_model=Venda)
async def create_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    total = sum(item["quantidade"] * item["preco_unitario"] for item in venda_data.itens)
    total = total - venda_data.desconto + venda_data.frete
    
    venda = Venda(
        cliente_id=venda_data.cliente_id,
        itens=venda_data.itens,
        desconto=venda_data.desconto,
        frete=venda_data.frete,
        total=total,
        forma_pagamento=venda_data.forma_pagamento,
        orcamento_id=venda_data.orcamento_id,
        user_id=current_user["id"]
    )
    
    await db.vendas.insert_one(venda.model_dump())
    
    # Baixar estoque e registrar movimentações
    for item in venda.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] - item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
            
            movimentacao = MovimentacaoEstoque(
                produto_id=item["produto_id"],
                tipo="saida",
                quantidade=item["quantidade"],
                referencia_tipo="venda",
                referencia_id=venda.id,
                user_id=current_user["id"]
            )
            await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    return venda

# ========== IA - INSIGHTS ==========

@api_router.post("/ia/previsao-demanda")
async def previsao_demanda(produto_id: str, current_user: dict = Depends(get_current_user)):
    # Buscar histórico de vendas
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Calcular total vendido
    total_vendido = 0
    for venda in vendas:
        for item in venda.get("itens", []):
            if item["produto_id"] == produto_id:
                total_vendido += item["quantidade"]
    
    # Usar GPT-4 para análise
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"previsao-{produto_id}",
        system_message="Você é um assistente especializado em análise de vendas e previsão de demanda."
    ).with_model("openai", "gpt-4")
    
    prompt = f"""Analise os dados do produto:
    Nome: {produto['nome']}
    Estoque Atual: {produto['estoque_atual']}
    Estoque Mínimo: {produto['estoque_minimo']}
    Total Vendido (histórico): {total_vendido}
    
    Forneça uma previsão de demanda para os próximos 30 dias e recomendações de compra."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    return {
        "produto": produto["nome"],
        "analise": response
    }

@api_router.post("/ia/recomendacoes-cliente")
async def recomendacoes_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    # Buscar histórico de compras do cliente
    vendas = await db.vendas.find({"cliente_id": cliente_id}, {"_id": 0}).to_list(100)
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    produtos_comprados = []
    for venda in vendas:
        for item in venda.get("itens", []):
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                produtos_comprados.append(produto["nome"])
    
    # Usar GPT-4 para recomendações
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"recomendacao-{cliente_id}",
        system_message="Você é um assistente especializado em recomendação de produtos."
    ).with_model("openai", "gpt-4")
    
    prompt = f"""Com base no histórico de compras do cliente {cliente['nome']}:
    Produtos já comprados: {', '.join(produtos_comprados[:10])}
    
    Sugira 5 produtos ou categorias que este cliente pode ter interesse em comprar."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    return {
        "cliente": cliente["nome"],
        "recomendacoes": response
    }

# ========== RELATÓRIOS ==========

@api_router.get("/relatorios/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    total_clientes = await db.clientes.count_documents({})
    total_produtos = await db.produtos.count_documents({})
    total_vendas = await db.vendas.count_documents({})
    
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
    total_faturamento = sum(v["total"] for v in vendas)
    
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    produtos_estoque_baixo = len([p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]])
    
    return {
        "total_clientes": total_clientes,
        "total_produtos": total_produtos,
        "total_vendas": total_vendas,
        "total_faturamento": total_faturamento,
        "produtos_estoque_baixo": produtos_estoque_baixo
    }

@api_router.get("/relatorios/vendas-por-periodo")
async def vendas_por_periodo(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
    
    # Agrupar por data
    vendas_por_dia = {}
    for venda in vendas:
        data = venda["created_at"][:10]
        if data not in vendas_por_dia:
            vendas_por_dia[data] = {"quantidade": 0, "total": 0}
        vendas_por_dia[data]["quantidade"] += 1
        vendas_por_dia[data]["total"] += venda["total"]
    
    return vendas_por_dia

# ========== LOGS ==========

@api_router.get("/logs", response_model=List[Log])
async def get_logs(current_user: dict = Depends(get_current_user)):
    logs = await db.logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return logs

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()