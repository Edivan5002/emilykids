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

class CheckEstoqueRequest(BaseModel):
    produto_id: str
    quantidade: int

class CheckEstoqueResponse(BaseModel):
    disponivel: bool
    estoque_atual: int
    estoque_reservado: int
    estoque_disponivel: int
    mensagem: str

class AjusteEstoqueRequest(BaseModel):
    produto_id: str
    quantidade: int  # Pode ser positivo (entrada) ou negativo (saída)
    motivo: str
    tipo: str  # "entrada" ou "saida"

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

@api_router.get("/")
async def root():
    return {"message": "InventoAI API - Sistema de Vendas com IA", "status": "online"}

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

# ========== USUÁRIOS (ADMIN) ==========

class UserUpdate(BaseModel):
    nome: str
    email: EmailStr
    papel: str
    ativo: bool
    senha: Optional[str] = None

@api_router.get("/usuarios", response_model=List[User])
async def get_usuarios(current_user: dict = Depends(get_current_user)):
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    usuarios = await db.users.find({}, {"_id": 0}).to_list(1000)
    return usuarios

@api_router.get("/usuarios/{user_id}", response_model=User)
async def get_usuario(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    usuario = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@api_router.put("/usuarios/{user_id}")
async def update_usuario(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se email já existe em outro usuário
    email_exists = await db.users.find_one({"email": user_data.email, "id": {"$ne": user_id}}, {"_id": 0})
    if email_exists:
        raise HTTPException(status_code=400, detail="Email já cadastrado para outro usuário")
    
    updated_data = {
        "id": user_id,
        "nome": user_data.nome,
        "email": user_data.email,
        "papel": user_data.papel,
        "ativo": user_data.ativo,
        "created_at": existing["created_at"]
    }
    
    # Atualizar senha se fornecida
    if user_data.senha:
        updated_data["senha_hash"] = hash_password(user_data.senha)
    else:
        updated_data["senha_hash"] = existing["senha_hash"]
    
    await db.users.replace_one({"id": user_id}, updated_data)
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="usuarios",
        acao="editar",
        detalhes={"usuario_editado_id": user_id}
    )
    
    return {"message": "Usuário atualizado com sucesso"}

@api_router.delete("/usuarios/{user_id}")
async def delete_usuario(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    # Não permitir deletar a si mesmo
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível deletar seu próprio usuário")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="usuarios",
        acao="deletar",
        detalhes={"usuario_deletado_id": user_id}
    )
    
    return {"message": "Usuário deletado com sucesso"}

@api_router.post("/usuarios/{user_id}/toggle-status")
async def toggle_usuario_status(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    # Não permitir desativar a si mesmo
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível desativar seu próprio usuário")
    
    usuario = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    novo_status = not usuario.get("ativo", True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"ativo": novo_status}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="usuarios",
        acao="editar",
        detalhes={"usuario_id": user_id, "novo_status": "ativo" if novo_status else "inativo"}
    )
    
    return {"message": f"Usuário {'ativado' if novo_status else 'desativado'} com sucesso", "ativo": novo_status}

# ========== AUTORIZAÇÃO ==========

class AutorizacaoRequest(BaseModel):
    email: EmailStr
    senha: str

@api_router.post("/auth/validar-autorizacao")
async def validar_autorizacao(auth_data: AutorizacaoRequest, current_user: dict = Depends(get_current_user)):
    """Valida credenciais de supervisor/admin para autorizar ações críticas"""
    usuario = await db.users.find_one({"email": auth_data.email}, {"_id": 0})
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se o usuário é admin ou gerente
    if usuario.get("papel") not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Usuário não autorizado. Apenas supervisores ou administradores.")
    
    # Verificar senha
    if not verify_password(auth_data.senha, usuario["senha_hash"]):
        raise HTTPException(status_code=401, detail="Senha incorreta")
    
    # Verificar se está ativo
    if not usuario.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário inativo")
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="autorizacao",
        acao="validar",
        detalhes={"autorizador": usuario["email"], "papel": usuario["papel"]}
    )
    
    return {
        "autorizado": True,
        "autorizador": {
            "nome": usuario["nome"],
            "email": usuario["email"],
            "papel": usuario["papel"]
        }
    }

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

@api_router.post("/estoque/check-disponibilidade", response_model=CheckEstoqueResponse)
async def check_disponibilidade_estoque(request: CheckEstoqueRequest, current_user: dict = Depends(get_current_user)):
    """
    Verifica a disponibilidade de estoque de um produto.
    Calcula: estoque_disponível = estoque_atual - estoque_reservado (orçamentos abertos)
    """
    # Buscar produto
    produto = await db.produtos.find_one({"id": request.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    estoque_atual = produto.get("estoque_atual", 0)
    
    # Calcular estoque reservado (orçamentos com status "aberto")
    orcamentos_abertos = await db.orcamentos.find({"status": "aberto"}, {"_id": 0}).to_list(1000)
    estoque_reservado = 0
    for orcamento in orcamentos_abertos:
        for item in orcamento.get("itens", []):
            if item.get("produto_id") == request.produto_id:
                estoque_reservado += item.get("quantidade", 0)
    
    # Calcular estoque disponível
    estoque_disponivel = estoque_atual - estoque_reservado
    
    # Verificar se a quantidade solicitada está disponível
    disponivel = estoque_disponivel >= request.quantidade
    
    if disponivel:
        mensagem = f"Estoque disponível. Você pode adicionar {request.quantidade} unidades."
    else:
        mensagem = f"Estoque insuficiente. Disponível: {estoque_disponivel} unidades (Atual: {estoque_atual}, Reservado: {estoque_reservado})"
    
    return CheckEstoqueResponse(
        disponivel=disponivel,
        estoque_atual=estoque_atual,
        estoque_reservado=estoque_reservado,
        estoque_disponivel=estoque_disponivel,
        mensagem=mensagem
    )

@api_router.post("/estoque/ajuste-manual")
async def ajuste_manual_estoque(request: AjusteEstoqueRequest, current_user: dict = Depends(get_current_user)):
    """
    Permite ajuste manual de estoque.
    Admin e Gerente podem ajustar direto.
    Vendedor precisa de autorização (validada no frontend via AutorizacaoModal).
    """
    # Buscar produto
    produto = await db.produtos.find_one({"id": request.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    estoque_atual = produto.get("estoque_atual", 0)
    
    # Calcular novo estoque baseado no tipo
    if request.tipo == "entrada":
        novo_estoque = estoque_atual + abs(request.quantidade)
        tipo_movimentacao = "entrada"
    else:  # saida
        novo_estoque = estoque_atual - abs(request.quantidade)
        tipo_movimentacao = "saida"
    
    # Validar se estoque não ficará negativo
    if novo_estoque < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ajuste resultaria em estoque negativo. Estoque atual: {estoque_atual}, Ajuste: -{abs(request.quantidade)}"
        )
    
    # Atualizar estoque
    await db.produtos.update_one(
        {"id": request.produto_id},
        {"$set": {"estoque_atual": novo_estoque}}
    )
    
    # Registrar movimentação
    movimentacao = MovimentacaoEstoque(
        produto_id=request.produto_id,
        tipo=tipo_movimentacao,
        quantidade=abs(request.quantidade),
        referencia_tipo="ajuste_manual",
        referencia_id=f"ajuste_{datetime.now(timezone.utc).timestamp()}",
        user_id=current_user["id"]
    )
    await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Log da ação
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="estoque",
        acao="ajuste_manual",
        detalhes={
            "produto_id": request.produto_id,
            "produto_nome": produto["nome"],
            "estoque_anterior": estoque_atual,
            "estoque_novo": novo_estoque,
            "quantidade_ajuste": request.quantidade,
            "tipo": request.tipo,
            "motivo": request.motivo
        }
    )
    
    return {
        "message": "Estoque ajustado com sucesso",
        "produto": produto["nome"],
        "estoque_anterior": estoque_atual,
        "estoque_novo": novo_estoque,
        "tipo": request.tipo,
        "quantidade": abs(request.quantidade)
    }

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

@api_router.delete("/notas-fiscais/{nota_id}")
async def delete_nota_fiscal(nota_id: str, current_user: dict = Depends(get_current_user)):
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    # Se a nota foi confirmada, reverter o estoque
    if nota.get("confirmado", False):
        for item in nota.get("itens", []):
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] - item["quantidade"]
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
                
                # Registrar movimentação de estorno
                movimentacao = MovimentacaoEstoque(
                    produto_id=item["produto_id"],
                    tipo="saida",
                    quantidade=item["quantidade"],
                    referencia_tipo="estorno_nota_fiscal",
                    referencia_id=nota_id,
                    user_id=current_user["id"]
                )
                await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Deletar nota fiscal
    await db.notas_fiscais.delete_one({"id": nota_id})
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="notas_fiscais",
        acao="deletar",
        detalhes={"nota_id": nota_id, "numero": nota.get("numero"), "confirmado": nota.get("confirmado")}
    )
    
    return {"message": "Nota fiscal excluída com sucesso"}

# ========== ORÇAMENTOS ==========

@api_router.get("/orcamentos", response_model=List[Orcamento])
async def get_orcamentos(current_user: dict = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).to_list(1000)
    return orcamentos

@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orcamento_data: OrcamentoCreate, current_user: dict = Depends(get_current_user)):
    # Validar estoque antes de criar o orçamento
    orcamentos_abertos = await db.orcamentos.find({"status": "aberto"}, {"_id": 0}).to_list(1000)
    
    for item in orcamento_data.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
        
        estoque_atual = produto.get("estoque_atual", 0)
        
        # Calcular estoque reservado
        estoque_reservado = 0
        for orc in orcamentos_abertos:
            for orc_item in orc.get("itens", []):
                if orc_item.get("produto_id") == item["produto_id"]:
                    estoque_reservado += orc_item.get("quantidade", 0)
        
        estoque_disponivel = estoque_atual - estoque_reservado
        
        if item["quantidade"] > estoque_disponivel:
            raise HTTPException(
                status_code=400, 
                detail=f"Estoque insuficiente para o produto '{produto['nome']}'. Disponível: {estoque_disponivel} unidades (Atual: {estoque_atual}, Reservado: {estoque_reservado})"
            )
    
    # Se passou pela validação, criar o orçamento
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

@api_router.delete("/orcamentos/{orcamento_id}")
async def delete_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Se o orçamento estava aberto, devolver estoque
    if orcamento["status"] == "aberto":
        for item in orcamento.get("itens", []):
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] + item["quantidade"]
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
    
    # Deletar orçamento
    await db.orcamentos.delete_one({"id": orcamento_id})
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="orcamentos",
        acao="deletar",
        detalhes={"orcamento_id": orcamento_id, "status": orcamento.get("status")}
    )
    
    return {"message": "Orçamento excluído com sucesso"}

# ========== VENDAS ==========

@api_router.get("/vendas", response_model=List[Venda])
async def get_vendas(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
    return vendas

@api_router.post("/vendas", response_model=Venda)
async def create_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    # Validar estoque antes de criar a venda
    orcamentos_abertos = await db.orcamentos.find({"status": "aberto"}, {"_id": 0}).to_list(1000)
    
    for item in venda_data.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
        
        estoque_atual = produto.get("estoque_atual", 0)
        
        # Calcular estoque reservado
        estoque_reservado = 0
        for orc in orcamentos_abertos:
            for orc_item in orc.get("itens", []):
                if orc_item.get("produto_id") == item["produto_id"]:
                    estoque_reservado += orc_item.get("quantidade", 0)
        
        estoque_disponivel = estoque_atual - estoque_reservado
        
        if item["quantidade"] > estoque_disponivel:
            raise HTTPException(
                status_code=400, 
                detail=f"Estoque insuficiente para o produto '{produto['nome']}'. Disponível: {estoque_disponivel} unidades (Atual: {estoque_atual}, Reservado: {estoque_reservado})"
            )
    
    # Se passou pela validação, criar a venda
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

@api_router.delete("/vendas/{venda_id}")
async def delete_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Devolver itens ao estoque
    for item in venda.get("itens", []):
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] + item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
            
            # Registrar movimentação de devolução
            movimentacao = MovimentacaoEstoque(
                produto_id=item["produto_id"],
                tipo="entrada",
                quantidade=item["quantidade"],
                referencia_tipo="devolucao_venda",
                referencia_id=venda_id,
                user_id=current_user["id"]
            )
            await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Deletar venda
    await db.vendas.delete_one({"id": venda_id})
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="vendas",
        acao="deletar",
        detalhes={"venda_id": venda_id, "total": venda.get("total")}
    )
    
    return {"message": "Venda excluída e estoque devolvido com sucesso"}

# ========== IA - INSIGHTS ==========

class PrevisaoDemandaRequest(BaseModel):
    produto_id: str

class RecomendacoesClienteRequest(BaseModel):
    cliente_id: str

@api_router.post("/ia/previsao-demanda")
async def previsao_demanda(request: PrevisaoDemandaRequest, current_user: dict = Depends(get_current_user)):
    try:
        produto_id = request.produto_id
        
        # Buscar produto
        produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Buscar histórico de vendas dos últimos 90 dias
        vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
        movimentacoes = await db.movimentacoes_estoque.find(
            {"produto_id": produto_id, "tipo": "saida"},
            {"_id": 0}
        ).to_list(1000)
        
        # Calcular estatísticas
        total_vendido = 0
        vendas_por_mes = {}
        quantidade_vendas = 0
        
        for venda in vendas:
            for item in venda.get("itens", []):
                if item["produto_id"] == produto_id:
                    total_vendido += item["quantidade"]
                    quantidade_vendas += 1
                    
                    # Agrupar por mês
                    mes = venda["created_at"][:7]
                    if mes not in vendas_por_mes:
                        vendas_por_mes[mes] = 0
                    vendas_por_mes[mes] += item["quantidade"]
        
        media_mensal = total_vendido / max(len(vendas_por_mes), 1)
        
        # Usar GPT-4 para análise
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"previsao-{produto_id}-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de vendas e previsão de demanda. Forneça análises objetivas e práticas."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Analise os seguintes dados de vendas do produto "{produto['nome']}":

DADOS ATUAIS:
- Estoque Atual: {produto['estoque_atual']} unidades
- Estoque Mínimo Configurado: {produto['estoque_minimo']} unidades
- Estoque Máximo Configurado: {produto['estoque_maximo']} unidades
- Preço de Venda: R$ {produto['preco_venda']:.2f}

HISTÓRICO DE VENDAS:
- Total Vendido (histórico completo): {total_vendido} unidades
- Número de Vendas: {quantidade_vendas} transações
- Média Mensal de Vendas: {media_mensal:.2f} unidades/mês
- Vendas por Mês: {vendas_por_mes}

TAREFA:
1. Faça uma previsão de demanda para os próximos 30 dias
2. Calcule a quantidade sugerida para compra/produção
3. Identifique tendências e padrões de venda
4. Forneça recomendações estratégicas de estoque
5. Avalie se o estoque atual é suficiente

Formate sua resposta de forma estruturada e objetiva."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {
            "success": True,
            "produto": {
                "id": produto["id"],
                "nome": produto["nome"],
                "sku": produto["sku"],
                "estoque_atual": produto["estoque_atual"],
                "estoque_minimo": produto["estoque_minimo"],
                "preco_venda": produto["preco_venda"]
            },
            "estatisticas": {
                "total_vendido": total_vendido,
                "quantidade_vendas": quantidade_vendas,
                "media_mensal": round(media_mensal, 2),
                "vendas_por_mes": vendas_por_mes
            },
            "analise_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

@api_router.post("/ia/recomendacoes-cliente")
async def recomendacoes_cliente(request: RecomendacoesClienteRequest, current_user: dict = Depends(get_current_user)):
    try:
        cliente_id = request.cliente_id
        
        # Buscar cliente
        cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Buscar histórico de compras
        vendas = await db.vendas.find({"cliente_id": cliente_id}, {"_id": 0}).to_list(1000)
        
        produtos_comprados = []
        categorias_compradas = set()
        marcas_compradas = set()
        total_gasto = 0
        
        for venda in vendas:
            total_gasto += venda.get("total", 0)
            for item in venda.get("itens", []):
                produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
                if produto:
                    produtos_comprados.append({
                        "nome": produto["nome"],
                        "quantidade": item["quantidade"],
                        "valor": item["preco_unitario"]
                    })
                    if produto.get("categoria_id"):
                        categorias_compradas.add(produto["categoria_id"])
                    if produto.get("marca_id"):
                        marcas_compradas.add(produto["marca_id"])
        
        # Buscar produtos disponíveis
        produtos_disponiveis = await db.produtos.find({"ativo": True}, {"_id": 0}).to_list(100)
        
        # Usar GPT-4 para recomendações
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recomendacao-{cliente_id}-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de comportamento de compra e recomendação de produtos. Forneça recomendações personalizadas e estratégicas."
        ).with_model("openai", "gpt-4")
        
        produtos_nomes = [p["nome"] for p in produtos_comprados[:20]]
        produtos_catalogo = [f"{p['nome']} (R$ {p['preco_venda']:.2f})" for p in produtos_disponiveis[:30]]
        
        prompt = f"""Analise o perfil de compras do cliente "{cliente['nome']}" e forneça recomendações personalizadas:

PERFIL DO CLIENTE:
- Nome: {cliente['nome']}
- Email: {cliente.get('email', 'Não informado')}
- Total Gasto: R$ {total_gasto:.2f}
- Número de Compras: {len(vendas)}

HISTÓRICO DE COMPRAS (produtos já comprados):
{chr(10).join([f"- {p['nome']} ({p['quantidade']}x) - R$ {p['valor']:.2f}" for p in produtos_comprados[:15]])}

PRODUTOS DISPONÍVEIS NO CATÁLOGO:
{chr(10).join([f"- {p}" for p in produtos_catalogo])}

TAREFA:
1. Identifique padrões de compra e preferências do cliente
2. Sugira 5-8 produtos específicos que o cliente pode ter interesse
3. Explique o motivo de cada recomendação (baseado no histórico)
4. Sugira estratégias de cross-sell e up-sell
5. Avalie o perfil de valor do cliente (ticket médio, frequência)

Formate sua resposta de forma estruturada e persuasiva."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {
            "success": True,
            "cliente": {
                "id": cliente["id"],
                "nome": cliente["nome"],
                "email": cliente.get("email"),
                "cpf_cnpj": cliente["cpf_cnpj"]
            },
            "estatisticas": {
                "total_compras": len(vendas),
                "total_gasto": round(total_gasto, 2),
                "ticket_medio": round(total_gasto / max(len(vendas), 1), 2),
                "produtos_distintos": len(set([p["nome"] for p in produtos_comprados]))
            },
            "recomendacoes_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

@api_router.get("/ia/analise-preditiva")
async def analise_preditiva(current_user: dict = Depends(get_current_user)):
    try:
        # Coletar dados gerais do sistema
        total_clientes = await db.clientes.count_documents({})
        total_produtos = await db.produtos.count_documents({"ativo": True})
        
        vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
        produtos = await db.produtos.find({"ativo": True}, {"_id": 0}).to_list(1000)
        
        # Calcular métricas
        total_vendas = len(vendas)
        faturamento_total = sum(v.get("total", 0) for v in vendas)
        ticket_medio = faturamento_total / max(total_vendas, 1)
        
        # Produtos mais vendidos
        vendas_por_produto = {}
        for venda in vendas:
            for item in venda.get("itens", []):
                pid = item["produto_id"]
                if pid not in vendas_por_produto:
                    vendas_por_produto[pid] = 0
                vendas_por_produto[pid] += item["quantidade"]
        
        top_produtos = sorted(vendas_por_produto.items(), key=lambda x: x[1], reverse=True)[:10]
        top_produtos_info = []
        for pid, qtd in top_produtos:
            p = await db.produtos.find_one({"id": pid}, {"_id": 0})
            if p:
                top_produtos_info.append(f"{p['nome']} ({qtd} unidades)")
        
        # Produtos com estoque baixo
        produtos_estoque_baixo = [p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]]
        
        # Análise temporal
        vendas_por_mes = {}
        for venda in vendas:
            mes = venda["created_at"][:7]
            if mes not in vendas_por_mes:
                vendas_por_mes[mes] = {"quantidade": 0, "valor": 0}
            vendas_por_mes[mes]["quantidade"] += 1
            vendas_por_mes[mes]["valor"] += venda.get("total", 0)
        
        # Usar GPT-4 para análise preditiva geral
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analise-preditiva-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de negócios e business intelligence. Forneça insights estratégicos e previsões de mercado."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Realize uma análise preditiva completa do negócio EMILY KIDS com base nos seguintes dados:

VISÃO GERAL DO NEGÓCIO:
- Total de Clientes Cadastrados: {total_clientes}
- Total de Produtos Ativos: {total_produtos}
- Total de Vendas Realizadas: {total_vendas}
- Faturamento Total: R$ {faturamento_total:.2f}
- Ticket Médio: R$ {ticket_medio:.2f}

PRODUTOS MAIS VENDIDOS:
{chr(10).join([f"- {info}" for info in top_produtos_info])}

ALERTAS DE ESTOQUE:
- Produtos com Estoque Baixo: {len(produtos_estoque_baixo)}

EVOLUÇÃO TEMPORAL (Vendas por Mês):
{chr(10).join([f"- {mes}: {info['quantidade']} vendas, R$ {info['valor']:.2f}" for mes, info in sorted(vendas_por_mes.items())])}

TAREFA - FORNEÇA UMA ANÁLISE COMPLETA INCLUINDO:
1. **Tendências de Mercado**: Identifique padrões de crescimento ou declínio
2. **Previsão de Faturamento**: Estime o faturamento para os próximos 3 meses
3. **Análise de Produtos**: Identifique produtos com potencial e produtos em declínio
4. **Gestão de Estoque**: Recomendações para otimização de estoque
5. **Estratégias de Crescimento**: Sugestões para aumentar vendas e fidelizar clientes
6. **Riscos e Oportunidades**: Identifique pontos de atenção e oportunidades de mercado
7. **KPIs Recomendados**: Quais métricas acompanhar para melhoria contínua

Seja específico, use números e forneça recomendações práticas e acionáveis."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {
            "success": True,
            "metricas_gerais": {
                "total_clientes": total_clientes,
                "total_produtos": total_produtos,
                "total_vendas": total_vendas,
                "faturamento_total": round(faturamento_total, 2),
                "ticket_medio": round(ticket_medio, 2),
                "produtos_estoque_baixo": len(produtos_estoque_baixo)
            },
            "top_produtos": top_produtos_info,
            "evolucao_mensal": vendas_por_mes,
            "analise_preditiva_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

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

# ========== RELATÓRIOS AVANÇADOS ==========

@api_router.get("/relatorios/dashboard/kpis")
async def get_kpis_dashboard(data_inicio: str = None, data_fim: str = None, current_user: dict = Depends(get_current_user)):
    """
    Retorna KPIs principais do dashboard executivo
    """
    # Buscar todos os dados necessários
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(10000)
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(10000)
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).to_list(10000)
    
    # Filtrar por data se fornecido
    if data_inicio and data_fim:
        vendas = [v for v in vendas if data_inicio <= v["created_at"][:10] <= data_fim]
        orcamentos = [o for o in orcamentos if data_inicio <= o["created_at"][:10] <= data_fim]
    
    # Cálculos de KPIs
    total_vendas = len(vendas)
    faturamento_total = sum(v["total"] for v in vendas)
    ticket_medio = faturamento_total / total_vendas if total_vendas > 0 else 0
    
    total_descontos = sum(v.get("desconto", 0) for v in vendas)
    total_frete = sum(v.get("frete", 0) for v in vendas)
    
    # Estoque
    valor_estoque = sum(p["estoque_atual"] * p["preco_custo"] for p in produtos)
    produtos_alerta_minimo = len([p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]])
    
    # Orçamentos
    orcamentos_abertos = len([o for o in orcamentos if o["status"] == "aberto"])
    orcamentos_convertidos = len([o for o in orcamentos if o["status"] == "vendido"])
    taxa_conversao = (orcamentos_convertidos / len(orcamentos) * 100) if len(orcamentos) > 0 else 0
    
    # Clientes ativos (compraram no período)
    clientes_ativos = len(set(v["cliente_id"] for v in vendas))
    
    # Top produtos
    produtos_vendidos = {}
    for venda in vendas:
        for item in venda.get("itens", []):
            pid = item["produto_id"]
            if pid not in produtos_vendidos:
                produtos_vendidos[pid] = {"quantidade": 0, "faturamento": 0}
            produtos_vendidos[pid]["quantidade"] += item["quantidade"]
            produtos_vendidos[pid]["faturamento"] += item["quantidade"] * item["preco_unitario"]
    
    top_produtos = sorted(produtos_vendidos.items(), key=lambda x: x[1]["faturamento"], reverse=True)[:5]
    
    return {
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim
        },
        "vendas": {
            "total": total_vendas,
            "faturamento": faturamento_total,
            "ticket_medio": ticket_medio,
            "total_descontos": total_descontos,
            "total_frete": total_frete,
            "faturamento_liquido": faturamento_total
        },
        "estoque": {
            "valor_total": valor_estoque,
            "produtos_total": len(produtos),
            "alertas_minimo": produtos_alerta_minimo
        },
        "orcamentos": {
            "total": len(orcamentos),
            "abertos": orcamentos_abertos,
            "convertidos": orcamentos_convertidos,
            "taxa_conversao": taxa_conversao
        },
        "clientes": {
            "total": len(clientes),
            "ativos": clientes_ativos
        },
        "top_produtos": [
            {
                "produto_id": pid,
                "quantidade": data["quantidade"],
                "faturamento": data["faturamento"]
            } for pid, data in top_produtos
        ]
    }

@api_router.get("/relatorios/vendas/por-periodo")
async def relatorio_vendas_periodo(
    data_inicio: str, 
    data_fim: str,
    agrupamento: str = "dia",  # dia, semana, mes
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de vendas agrupadas por período com comparação
    """
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    
    # Filtrar por período
    vendas_periodo = [v for v in vendas if data_inicio <= v["created_at"][:10] <= data_fim]
    
    # Agrupar vendas
    vendas_agrupadas = {}
    for venda in vendas_periodo:
        if agrupamento == "dia":
            chave = venda["created_at"][:10]
        elif agrupamento == "mes":
            chave = venda["created_at"][:7]
        else:  # semana
            data = datetime.fromisoformat(venda["created_at"])
            chave = f"{data.year}-W{data.isocalendar()[1]:02d}"
        
        if chave not in vendas_agrupadas:
            vendas_agrupadas[chave] = {
                "quantidade": 0,
                "faturamento": 0,
                "ticket_medio": 0
            }
        
        vendas_agrupadas[chave]["quantidade"] += 1
        vendas_agrupadas[chave]["faturamento"] += venda["total"]
    
    # Calcular ticket médio
    for chave in vendas_agrupadas:
        if vendas_agrupadas[chave]["quantidade"] > 0:
            vendas_agrupadas[chave]["ticket_medio"] = vendas_agrupadas[chave]["faturamento"] / vendas_agrupadas[chave]["quantidade"]
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "agrupamento": agrupamento,
        "total_vendas": len(vendas_periodo),
        "faturamento_total": sum(v["total"] for v in vendas_periodo),
        "dados": vendas_agrupadas
    }

@api_router.get("/relatorios/vendas/por-vendedor")
async def relatorio_vendas_vendedor(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de vendas por vendedor/usuário
    """
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    usuarios = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    if data_inicio and data_fim:
        vendas = [v for v in vendas if data_inicio <= v["created_at"][:10] <= data_fim]
    
    # Agrupar por vendedor
    vendas_por_vendedor = {}
    for venda in vendas:
        user_id = venda.get("user_id")
        if user_id not in vendas_por_vendedor:
            vendas_por_vendedor[user_id] = {
                "quantidade": 0,
                "faturamento": 0,
                "ticket_medio": 0
            }
        vendas_por_vendedor[user_id]["quantidade"] += 1
        vendas_por_vendedor[user_id]["faturamento"] += venda["total"]
    
    # Calcular ticket médio e adicionar nome do usuário
    resultado = []
    for user_id, data in vendas_por_vendedor.items():
        usuario = next((u for u in usuarios if u["id"] == user_id), None)
        data["ticket_medio"] = data["faturamento"] / data["quantidade"]
        data["user_id"] = user_id
        data["user_nome"] = usuario["nome"] if usuario else "Usuário Desconhecido"
        resultado.append(data)
    
    resultado.sort(key=lambda x: x["faturamento"], reverse=True)
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "vendedores": resultado
    }

@api_router.get("/relatorios/financeiro/dre")
async def relatorio_dre(
    data_inicio: str,
    data_fim: str,
    current_user: dict = Depends(get_current_user)
):
    """
    DRE Simplificado - Demonstrativo de Resultado
    """
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(10000)
    
    vendas_periodo = [v for v in vendas if data_inicio <= v["created_at"][:10] <= data_fim]
    
    # Receita Bruta
    receita_bruta = sum(v["total"] for v in vendas_periodo)
    
    # Descontos
    total_descontos = sum(v.get("desconto", 0) for v in vendas_periodo)
    
    # Receita Líquida
    receita_liquida = receita_bruta - total_descontos
    
    # Custo dos Produtos Vendidos (CMV)
    cmv = 0
    for venda in vendas_periodo:
        for item in venda.get("itens", []):
            produto = next((p for p in produtos if p["id"] == item["produto_id"]), None)
            if produto:
                cmv += item["quantidade"] * produto["preco_custo"]
    
    # Lucro Bruto
    lucro_bruto = receita_liquida - cmv
    margem_bruta = (lucro_bruto / receita_liquida * 100) if receita_liquida > 0 else 0
    
    # Lucro Líquido (simplificado, sem despesas operacionais)
    lucro_liquido = lucro_bruto
    margem_liquida = (lucro_liquido / receita_liquida * 100) if receita_liquida > 0 else 0
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "receita_bruta": receita_bruta,
        "descontos": total_descontos,
        "receita_liquida": receita_liquida,
        "cmv": cmv,
        "lucro_bruto": lucro_bruto,
        "margem_bruta_percentual": margem_bruta,
        "lucro_liquido": lucro_liquido,
        "margem_liquida_percentual": margem_liquida
    }

@api_router.get("/relatorios/estoque/curva-abc")
async def relatorio_curva_abc(current_user: dict = Depends(get_current_user)):
    """
    Curva ABC de produtos baseada em faturamento
    """
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(10000)
    
    # Calcular faturamento por produto
    faturamento_por_produto = {}
    for venda in vendas:
        for item in venda.get("itens", []):
            pid = item["produto_id"]
            if pid not in faturamento_por_produto:
                faturamento_por_produto[pid] = 0
            faturamento_por_produto[pid] += item["quantidade"] * item["preco_unitario"]
    
    # Ordenar por faturamento
    produtos_ordenados = sorted(faturamento_por_produto.items(), key=lambda x: x[1], reverse=True)
    
    # Calcular percentuais acumulados
    faturamento_total = sum(faturamento_por_produto.values())
    percentual_acumulado = 0
    curva_abc = []
    
    for pid, faturamento in produtos_ordenados:
        produto = next((p for p in produtos if p["id"] == pid), None)
        percentual = (faturamento / faturamento_total * 100) if faturamento_total > 0 else 0
        percentual_acumulado += percentual
        
        # Classificação ABC
        if percentual_acumulado <= 80:
            classe = "A"
        elif percentual_acumulado <= 95:
            classe = "B"
        else:
            classe = "C"
        
        curva_abc.append({
            "produto_id": pid,
            "produto_nome": produto["nome"] if produto else "Desconhecido",
            "faturamento": faturamento,
            "percentual": percentual,
            "percentual_acumulado": percentual_acumulado,
            "classe": classe
        })
    
    # Contagem por classe
    classe_a = len([p for p in curva_abc if p["classe"] == "A"])
    classe_b = len([p for p in curva_abc if p["classe"] == "B"])
    classe_c = len([p for p in curva_abc if p["classe"] == "C"])
    
    return {
        "total_produtos": len(curva_abc),
        "faturamento_total": faturamento_total,
        "distribuicao": {
            "classe_a": classe_a,
            "classe_b": classe_b,
            "classe_c": classe_c
        },
        "produtos": curva_abc
    }

@api_router.get("/relatorios/clientes/rfm")
async def relatorio_rfm(current_user: dict = Depends(get_current_user)):
    """
    Análise RFM (Recência, Frequência, Valor Monetário) dos clientes
    """
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(10000)
    
    data_referencia = datetime.now(timezone.utc)
    
    # Calcular RFM por cliente
    rfm_por_cliente = {}
    for venda in vendas:
        cliente_id = venda["cliente_id"]
        if cliente_id not in rfm_por_cliente:
            rfm_por_cliente[cliente_id] = {
                "recencia": 9999,  # dias desde última compra
                "frequencia": 0,
                "valor_monetario": 0,
                "ultima_compra": None
            }
        
        data_venda = datetime.fromisoformat(venda["created_at"])
        dias_desde_compra = (data_referencia - data_venda).days
        
        # Recência (menor é melhor)
        if dias_desde_compra < rfm_por_cliente[cliente_id]["recencia"]:
            rfm_por_cliente[cliente_id]["recencia"] = dias_desde_compra
            rfm_por_cliente[cliente_id]["ultima_compra"] = venda["created_at"]
        
        # Frequência
        rfm_por_cliente[cliente_id]["frequencia"] += 1
        
        # Valor Monetário
        rfm_por_cliente[cliente_id]["valor_monetario"] += venda["total"]
    
    # Calcular scores RFM (1-5)
    resultado = []
    for cliente_id, rfm in rfm_por_cliente.items():
        cliente = next((c for c in clientes if c["id"] == cliente_id), None)
        
        # Score de Recência (inverso - quanto menor, melhor)
        if rfm["recencia"] <= 30:
            score_r = 5
        elif rfm["recencia"] <= 60:
            score_r = 4
        elif rfm["recencia"] <= 90:
            score_r = 3
        elif rfm["recencia"] <= 180:
            score_r = 2
        else:
            score_r = 1
        
        # Score de Frequência
        if rfm["frequencia"] >= 10:
            score_f = 5
        elif rfm["frequencia"] >= 7:
            score_f = 4
        elif rfm["frequencia"] >= 4:
            score_f = 3
        elif rfm["frequencia"] >= 2:
            score_f = 2
        else:
            score_f = 1
        
        # Score de Valor Monetário
        if rfm["valor_monetario"] >= 5000:
            score_m = 5
        elif rfm["valor_monetario"] >= 3000:
            score_m = 4
        elif rfm["valor_monetario"] >= 1000:
            score_m = 3
        elif rfm["valor_monetario"] >= 500:
            score_m = 2
        else:
            score_m = 1
        
        # Score RFM total
        score_total = score_r + score_f + score_m
        
        # Segmentação
        if score_r >= 4 and score_f >= 4 and score_m >= 4:
            segmento = "Champions"
        elif score_r >= 3 and score_f >= 3:
            segmento = "Loyal Customers"
        elif score_r >= 4:
            segmento = "Promising"
        elif score_f >= 4:
            segmento = "At Risk"
        else:
            segmento = "Need Attention"
        
        resultado.append({
            "cliente_id": cliente_id,
            "cliente_nome": cliente["nome"] if cliente else "Desconhecido",
            "recencia_dias": rfm["recencia"],
            "frequencia": rfm["frequencia"],
            "valor_monetario": rfm["valor_monetario"],
            "score_r": score_r,
            "score_f": score_f,
            "score_m": score_m,
            "score_total": score_total,
            "segmento": segmento,
            "ultima_compra": rfm["ultima_compra"]
        })
    
    resultado.sort(key=lambda x: x["score_total"], reverse=True)
    
    return {
        "total_clientes": len(resultado),
        "clientes": resultado
    }

@api_router.get("/relatorios/orcamentos/conversao")
async def relatorio_conversao_orcamentos(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Análise de conversão de orçamentos em vendas
    """
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).to_list(10000)
    
    if data_inicio and data_fim:
        orcamentos = [o for o in orcamentos if data_inicio <= o["created_at"][:10] <= data_fim]
    
    # Estatísticas por status
    total = len(orcamentos)
    abertos = len([o for o in orcamentos if o["status"] == "aberto"])
    vendidos = len([o for o in orcamentos if o["status"] == "vendido"])
    devolvidos = len([o for o in orcamentos if o["status"] == "devolvido"])
    cancelados = len([o for o in orcamentos if o.get("status") == "cancelado"])
    
    # Taxa de conversão
    taxa_conversao = (vendidos / total * 100) if total > 0 else 0
    
    # Valor médio
    valor_medio_orcamento = sum(o["total"] for o in orcamentos) / total if total > 0 else 0
    valor_medio_vendido = sum(o["total"] for o in orcamentos if o["status"] == "vendido") / vendidos if vendidos > 0 else 0
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "total_orcamentos": total,
        "status": {
            "abertos": abertos,
            "vendidos": vendidos,
            "devolvidos": devolvidos,
            "cancelados": cancelados
        },
        "taxa_conversao_percentual": taxa_conversao,
        "valores": {
            "valor_medio_orcamento": valor_medio_orcamento,
            "valor_medio_vendido": valor_medio_vendido
        }
    }

@api_router.get("/relatorios/operacional/auditoria")
async def relatorio_auditoria(
    data_inicio: str = None,
    data_fim: str = None,
    user_id: str = None,
    acao: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de auditoria - logs de ações do sistema
    """
    logs = await db.logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5000)
    
    # Filtros
    if data_inicio and data_fim:
        logs = [l for l in logs if data_inicio <= l["timestamp"][:10] <= data_fim]
    
    if user_id:
        logs = [l for l in logs if l["user_id"] == user_id]
    
    if acao:
        logs = [l for l in logs if l["acao"] == acao]
    
    # Estatísticas
    acoes_por_tipo = {}
    acoes_por_usuario = {}
    acoes_por_tela = {}
    
    for log in logs:
        # Por tipo de ação
        acao_tipo = log["acao"]
        if acao_tipo not in acoes_por_tipo:
            acoes_por_tipo[acao_tipo] = 0
        acoes_por_tipo[acao_tipo] += 1
        
        # Por usuário
        usuario = log["user_nome"]
        if usuario not in acoes_por_usuario:
            acoes_por_usuario[usuario] = 0
        acoes_por_usuario[usuario] += 1
        
        # Por tela
        tela = log["tela"]
        if tela not in acoes_por_tela:
            acoes_por_tela[tela] = 0
        acoes_por_tela[tela] += 1
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "total_acoes": len(logs),
        "acoes_por_tipo": acoes_por_tipo,
        "acoes_por_usuario": acoes_por_usuario,
        "acoes_por_tela": acoes_por_tela,
        "logs_recentes": logs[:50]  # Últimos 50 logs
    }

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