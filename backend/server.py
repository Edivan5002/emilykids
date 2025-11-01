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
    
    # Identificação
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    
    # Usuário
    user_id: str
    user_nome: str
    user_email: Optional[str] = None
    user_papel: Optional[str] = None
    
    # Requisição
    ip: str
    user_agent: Optional[str] = None
    navegador: Optional[str] = None
    sistema_operacional: Optional[str] = None
    dispositivo: Optional[str] = None
    
    # Geolocalização (básica via IP)
    pais: Optional[str] = None
    cidade: Optional[str] = None
    
    # Contexto da Requisição
    metodo_http: Optional[str] = None  # GET, POST, PUT, DELETE
    url: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    
    # Ação
    tela: str
    acao: str  # login, logout, criar, editar, deletar, visualizar, exportar, etc
    severidade: str = "INFO"  # INFO, WARNING, ERROR, CRITICAL, SECURITY
    
    # Performance
    tempo_execucao_ms: Optional[float] = None
    
    # Detalhes
    detalhes: Optional[dict] = None
    detalhes_criptografados: Optional[str] = None
    
    # Erro (se aplicável)
    erro: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # Timestamp
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Arquivamento
    arquivado: bool = False
    data_arquivamento: Optional[str] = None

class LogSeguranca(BaseModel):
    """Log específico para eventos de segurança"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # login_falho, acesso_negado, tentativa_suspeita, mudanca_senha, mudanca_permissao
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip: str
    user_agent: Optional[str] = None
    detalhes: dict
    severidade: str = "SECURITY"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    investigado: bool = False
    falso_positivo: bool = False

class FiltrosLog(BaseModel):
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    user_id: Optional[str] = None
    severidade: Optional[str] = None
    tela: Optional[str] = None
    acao: Optional[str] = None
    metodo_http: Optional[str] = None
    limit: int = 50
    offset: int = 0

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
    caminho_xml: Optional[str] = None
    chave_acesso_nfe: Optional[str] = None
    itens: List[dict]  # [{"produto_id": "", "quantidade": 0, "preco_unitario": 0}]
    
    # Status workflow
    status: str = "rascunho"  # rascunho, aguardando_aprovacao, confirmada, cancelada
    confirmado: bool = False  # Manter compatibilidade
    
    # Impostos
    icms: float = 0
    ipi: float = 0
    pis: float = 0
    cofins: float = 0
    
    # Pagamento
    condicoes_pagamento: Optional[str] = None
    data_vencimento: Optional[str] = None
    numero_parcelas: int = 1
    
    # Cancelamento
    cancelada: bool = False
    motivo_cancelamento: Optional[str] = None
    cancelada_por: Optional[str] = None
    data_cancelamento: Optional[str] = None
    
    # Auditoria
    criado_por: Optional[str] = None
    aprovado_por: Optional[str] = None
    data_aprovacao: Optional[str] = None
    historico_alteracoes: List[dict] = []
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class NotaFiscalCreate(BaseModel):
    numero: str
    serie: str
    fornecedor_id: str
    data_emissao: str
    valor_total: float
    xml: Optional[str] = None
    chave_acesso_nfe: Optional[str] = None
    itens: List[dict]
    icms: float = 0
    ipi: float = 0
    pis: float = 0
    cofins: float = 0
    condicoes_pagamento: Optional[str] = None
    data_vencimento: Optional[str] = None
    numero_parcelas: int = 1

class NotaFiscalUpdate(BaseModel):
    numero: Optional[str] = None
    serie: Optional[str] = None
    fornecedor_id: Optional[str] = None
    data_emissao: Optional[str] = None
    valor_total: Optional[float] = None
    itens: Optional[List[dict]] = None
    icms: Optional[float] = None
    ipi: Optional[float] = None
    pis: Optional[float] = None
    cofins: Optional[float] = None
    condicoes_pagamento: Optional[str] = None
    data_vencimento: Optional[str] = None
    numero_parcelas: Optional[int] = None

class CancelarNotaRequest(BaseModel):
    motivo: str

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
    desconto_percentual: float = 0
    frete: float = 0
    total: float
    subtotal: float = 0
    margem_lucro: float = 0
    
    # Status expandido
    status: str = "rascunho"  # rascunho, em_analise, aprovado, aberto, vendido, devolvido, expirado, perdido
    
    # Validade
    data_validade: str  # Calculada automaticamente
    dias_validade: int = 7  # Padrão 7 dias
    
    # Observações
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None
    
    # Versionamento
    versao: int = 1
    orcamento_original_id: Optional[str] = None  # Se for revisão
    
    # Perda
    perdido: bool = False
    motivo_perda: Optional[str] = None
    data_perda: Optional[str] = None
    
    # Aprovação
    requer_aprovacao: bool = False
    aprovado: bool = False
    aprovado_por: Optional[str] = None
    data_aprovacao: Optional[str] = None
    
    # Auditoria
    user_id: str
    criado_por_nome: Optional[str] = None
    historico_alteracoes: List[dict] = []
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class OrcamentoCreate(BaseModel):
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    frete: float = 0
    dias_validade: int = 7
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None

class OrcamentoUpdate(BaseModel):
    cliente_id: Optional[str] = None
    itens: Optional[List[dict]] = None
    desconto: Optional[float] = None
    frete: Optional[float] = None
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None

class ConversaoVendaRequest(BaseModel):
    forma_pagamento: str
    desconto: Optional[float] = None  # Novo desconto (se diferente do orçamento)
    frete: Optional[float] = None  # Novo frete (se diferente do orçamento)
    observacoes: Optional[str] = None

class DuplicarOrcamentoRequest(BaseModel):
    novo_cliente_id: Optional[str] = None  # Se None, mantém o mesmo cliente

class MarcarPerdidoRequest(BaseModel):
    motivo: str

class Parcela(BaseModel):
    numero: int
    valor: float
    data_vencimento: str
    data_pagamento: Optional[str] = None
    status: str = "pendente"  # pendente, paga, atrasada
    juros: float = 0
    multa: float = 0

class Venda(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_venda: str  # Sequencial legível VEN-00001
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    desconto_percentual: float = 0
    frete: float = 0
    subtotal: float = 0
    total: float
    
    # Pagamento
    forma_pagamento: str  # cartao, pix, boleto, dinheiro
    numero_parcelas: int = 1
    valor_parcela: float = 0
    parcelas: List[dict] = []  # Lista de parcelas
    taxa_cartao: float = 0
    taxa_cartao_percentual: float = 0
    valor_pago: float = 0
    saldo_pendente: float = 0
    data_pagamento: Optional[str] = None
    
    # Status
    status_venda: str = "rascunho"  # rascunho, aguardando_pagamento, paga, parcialmente_paga, cancelada
    status_entrega: str = "aguardando_entrega"  # aguardando_entrega, em_transito, entregue, retirada_loja
    
    # Entrega
    codigo_rastreio: Optional[str] = None
    data_entrega: Optional[str] = None
    
    # Cancelamento
    cancelada: bool = False
    motivo_cancelamento: Optional[str] = None
    cancelada_por: Optional[str] = None
    data_cancelamento: Optional[str] = None
    
    # Devolução
    devolvida: bool = False
    itens_devolvidos: List[dict] = []
    valor_devolvido: float = 0
    
    # Comissão
    comissao_vendedor: float = 0
    comissao_percentual: float = 0
    
    # Observações
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None
    observacoes_entrega: Optional[str] = None
    
    # Autorização
    requer_autorizacao: bool = False
    autorizado: bool = False
    autorizado_por: Optional[str] = None
    data_autorizacao: Optional[str] = None
    
    # Origem
    orcamento_id: Optional[str] = None
    
    # Auditoria
    user_id: str
    vendedor_nome: Optional[str] = None
    historico_alteracoes: List[dict] = []
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class VendaCreate(BaseModel):
    cliente_id: str
    itens: List[dict]
    desconto: float = 0
    frete: float = 0
    forma_pagamento: str
    numero_parcelas: int = 1
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None
    orcamento_id: Optional[str] = None

class VendaUpdate(BaseModel):
    itens: Optional[List[dict]] = None
    desconto: Optional[float] = None
    frete: Optional[float] = None
    observacoes: Optional[str] = None
    observacoes_vendedor: Optional[str] = None

class CancelarVendaRequest(BaseModel):
    motivo: str

class DevolucaoParcialRequest(BaseModel):
    itens_devolver: List[dict]  # [{"produto_id": "", "quantidade": 0}]
    motivo: str

class RegistrarPagamentoRequest(BaseModel):
    valor: float
    parcela_numero: Optional[int] = None  # Se None, considera pagamento integral
    data_pagamento: Optional[str] = None
    comprovante: Optional[str] = None

class TrocaProdutoRequest(BaseModel):
    produto_saida_id: str
    quantidade_saida: int
    produto_entrada_id: str
    quantidade_entrada: int
    motivo: str

class AtualizarEntregaRequest(BaseModel):
    status_entrega: str  # em_transito, entregue, retirada_loja
    codigo_rastreio: Optional[str] = None
    observacoes_entrega: Optional[str] = None

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

async def log_action(
    ip: str, 
    user_id: str, 
    user_nome: str, 
    tela: str, 
    acao: str, 
    detalhes: dict = None,
    severidade: str = "INFO",
    metodo_http: str = None,
    url: str = None,
    status_code: int = None,
    user_agent: str = None,
    session_id: str = None,
    tempo_execucao_ms: float = None,
    erro: str = None,
    stack_trace: str = None
):
    """
    Função melhorada de logging com contexto completo
    """
    # Parsear User-Agent se fornecido
    navegador = None
    so = None
    dispositivo = None
    if user_agent:
        ua_lower = user_agent.lower()
        # Navegador
        if "chrome" in ua_lower:
            navegador = "Chrome"
        elif "firefox" in ua_lower:
            navegador = "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            navegador = "Safari"
        elif "edge" in ua_lower:
            navegador = "Edge"
        
        # SO
        if "windows" in ua_lower:
            so = "Windows"
        elif "mac" in ua_lower:
            so = "MacOS"
        elif "linux" in ua_lower:
            so = "Linux"
        elif "android" in ua_lower:
            so = "Android"
        elif "ios" in ua_lower or "iphone" in ua_lower:
            so = "iOS"
        
        # Dispositivo
        if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            dispositivo = "Mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            dispositivo = "Tablet"
        else:
            dispositivo = "Desktop"
    
    log = Log(
        ip=ip,
        user_id=user_id,
        user_nome=user_nome,
        tela=tela,
        acao=acao,
        severidade=severidade,
        detalhes=detalhes,
        metodo_http=metodo_http,
        url=url,
        status_code=status_code,
        user_agent=user_agent,
        navegador=navegador,
        sistema_operacional=so,
        dispositivo=dispositivo,
        session_id=session_id,
        tempo_execucao_ms=tempo_execucao_ms,
        erro=erro,
        stack_trace=stack_trace
    )
    
    await db.logs.insert_one(log.model_dump())
    
    # Alertas automáticos para eventos críticos
    if severidade in ["CRITICAL", "SECURITY"]:
        await enviar_alerta_critico(log)

async def log_seguranca(tipo: str, ip: str, detalhes: dict, user_id: str = None, user_email: str = None, user_agent: str = None):
    """
    Log específico para eventos de segurança
    """
    log_seg = LogSeguranca(
        tipo=tipo,
        user_id=user_id,
        user_email=user_email,
        ip=ip,
        user_agent=user_agent,
        detalhes=detalhes
    )
    
    await db.logs_seguranca.insert_one(log_seg.model_dump())
    
    # Alerta imediato
    await enviar_alerta_seguranca(log_seg)

async def enviar_alerta_critico(log: Log):
    """
    Envia alerta para eventos críticos (pode ser email, SMS, etc)
    """
    # TODO: Implementar envio de email/notificação
    # Por enquanto, apenas registra no console
    print(f"🚨 ALERTA CRÍTICO: {log.acao} por {log.user_nome} - {log.detalhes}")

async def enviar_alerta_seguranca(log: LogSeguranca):
    """
    Envia alerta para eventos de segurança
    """
    print(f"🔒 ALERTA SEGURANÇA: {log.tipo} - IP: {log.ip} - {log.detalhes}")

async def detectar_atividade_suspeita(user_id: str = None, ip: str = None) -> dict:
    """
    Detecta padrões suspeitos de atividade
    """
    suspeito = False
    motivos = []
    
    # Verificar múltiplos logins falhos
    if user_id or ip:
        filtro = {}
        if user_id:
            filtro["user_id"] = user_id
        if ip:
            filtro["ip"] = ip
        
        # Últimos 30 minutos
        tempo_limite = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        filtro["timestamp"] = {"$gte": tempo_limite}
        filtro["tipo"] = "login_falho"
        
        tentativas_falhas = await db.logs_seguranca.count_documents(filtro)
        
        if tentativas_falhas >= 5:
            suspeito = True
            motivos.append(f"{tentativas_falhas} tentativas de login falhadas em 30 minutos")
    
    return {
        "suspeito": suspeito,
        "motivos": motivos,
        "tentativas_falhas": tentativas_falhas if user_id or ip else 0
    }

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

# Valor mínimo que requer aprovação (pode ser configurado)
VALOR_MINIMO_APROVACAO = 5000.00

@api_router.get("/notas-fiscais", response_model=List[NotaFiscal])
async def get_notas_fiscais(
    status: str = None,
    fornecedor_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista notas fiscais com filtros opcionais"""
    filtro = {}
    if status:
        filtro["status"] = status
    if fornecedor_id:
        filtro["fornecedor_id"] = fornecedor_id
    
    notas = await db.notas_fiscais.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return notas

@api_router.post("/notas-fiscais", response_model=NotaFiscal)
async def create_nota_fiscal(nota_data: NotaFiscalCreate, current_user: dict = Depends(get_current_user)):
    """
    Cria uma nova nota fiscal com validações robustas
    """
    # VALIDAÇÃO 1: Duplicidade (numero + serie + fornecedor)
    nota_existente = await db.notas_fiscais.find_one({
        "numero": nota_data.numero,
        "serie": nota_data.serie,
        "fornecedor_id": nota_data.fornecedor_id,
        "cancelada": False
    }, {"_id": 0})
    
    if nota_existente:
        raise HTTPException(
            status_code=400,
            detail=f"Nota fiscal {nota_data.numero}/{nota_data.serie} já existe para este fornecedor"
        )
    
    # VALIDAÇÃO 2: Data de emissão não pode ser futura
    try:
        data_emissao = datetime.fromisoformat(nota_data.data_emissao)
        if data_emissao > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Data de emissão não pode ser futura"
            )
        
        # Validar se não é muito antiga (mais de 90 dias)
        dias_atras = (datetime.now(timezone.utc) - data_emissao).days
        if dias_atras > 90:
            raise HTTPException(
                status_code=400,
                detail=f"Data de emissão muito antiga ({dias_atras} dias). Limite: 90 dias"
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Data de emissão inválida")
    
    # VALIDAÇÃO 3: Fornecedor existe
    fornecedor = await db.fornecedores.find_one({"id": nota_data.fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # VALIDAÇÃO 4: Produtos existem e estão ativos
    for item in nota_data.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(
                status_code=404,
                detail=f"Produto {item['produto_id']} não encontrado"
            )
        if produto.get("status") == "inativo":
            raise HTTPException(
                status_code=400,
                detail=f"Produto '{produto['nome']}' está inativo"
            )
        
        # Validar preço unitário
        if item["preco_unitario"] <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Preço unitário do produto '{produto['nome']}' deve ser maior que zero"
            )
    
    # VALIDAÇÃO 5: Valor total deve bater com soma dos itens
    total_calculado = sum(item["quantidade"] * item["preco_unitario"] for item in nota_data.itens)
    if abs(total_calculado - nota_data.valor_total) > 0.01:  # Margem de 1 centavo
        raise HTTPException(
            status_code=400,
            detail=f"Valor total (R$ {nota_data.valor_total:.2f}) não corresponde à soma dos itens (R$ {total_calculado:.2f})"
        )
    
    # Determinar status inicial baseado no valor
    status_inicial = "rascunho"
    if nota_data.valor_total >= VALOR_MINIMO_APROVACAO:
        status_inicial = "aguardando_aprovacao"
    
    nota = NotaFiscal(
        **nota_data.model_dump(),
        status=status_inicial,
        criado_por=current_user["id"],
        historico_alteracoes=[{
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "criacao",
            "detalhes": f"Nota fiscal criada com status '{status_inicial}'"
        }]
    )
    
    await db.notas_fiscais.insert_one(nota.model_dump())
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="notas_fiscais",
        acao="criar",
        detalhes={
            "nota_id": nota.id,
            "numero": nota.numero,
            "valor": nota.valor_total,
            "status": status_inicial
        }
    )
    
    if status_inicial == "aguardando_aprovacao":
        toast_message = f"Nota fiscal criada. Valor R$ {nota_data.valor_total:.2f} requer aprovação!"
    else:
        toast_message = "Nota fiscal criada com sucesso!"
    
    return nota

@api_router.put("/notas-fiscais/{nota_id}")
async def update_nota_fiscal(
    nota_id: str,
    nota_data: NotaFiscalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Edita uma nota fiscal (apenas se status = rascunho)
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    # VALIDAÇÃO: Só pode editar se estiver em rascunho
    if nota["status"] != "rascunho":
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível editar nota com status '{nota['status']}'. Apenas rascunhos podem ser editados."
        )
    
    # Preparar dados para atualização
    update_data = {k: v for k, v in nota_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    # Registrar alterações no histórico
    alteracoes = []
    for campo, novo_valor in update_data.items():
        valor_antigo = nota.get(campo)
        if valor_antigo != novo_valor:
            alteracoes.append(f"{campo}: {valor_antigo} → {novo_valor}")
    
    if alteracoes:
        historico_entry = {
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "edicao",
            "detalhes": "; ".join(alteracoes)
        }
        
        if "historico_alteracoes" not in nota:
            nota["historico_alteracoes"] = []
        nota["historico_alteracoes"].append(historico_entry)
        update_data["historico_alteracoes"] = nota["historico_alteracoes"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": update_data}
    )
    
    return {"message": "Nota fiscal atualizada com sucesso", "alteracoes": alteracoes}

@api_router.post("/notas-fiscais/{nota_id}/solicitar-aprovacao")
async def solicitar_aprovacao_nota(nota_id: str, current_user: dict = Depends(get_current_user)):
    """
    Solicita aprovação para uma nota em rascunho
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    if nota["status"] != "rascunho":
        raise HTTPException(
            status_code=400,
            detail=f"Apenas notas em rascunho podem solicitar aprovação. Status atual: {nota['status']}"
        )
    
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "solicitacao_aprovacao",
        "detalhes": "Nota enviada para aprovação"
    }
    
    if "historico_alteracoes" not in nota:
        nota["historico_alteracoes"] = []
    nota["historico_alteracoes"].append(historico_entry)
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": {
            "status": "aguardando_aprovacao",
            "historico_alteracoes": nota["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Nota fiscal enviada para aprovação"}

@api_router.post("/notas-fiscais/{nota_id}/aprovar")
async def aprovar_nota_fiscal(nota_id: str, current_user: dict = Depends(get_current_user)):
    """
    Aprova uma nota (apenas admin/gerente)
    """
    # Validar permissão
    if current_user["papel"] not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem aprovar notas fiscais")
    
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    if nota["status"] != "aguardando_aprovacao":
        raise HTTPException(
            status_code=400,
            detail=f"Apenas notas aguardando aprovação podem ser aprovadas. Status atual: {nota['status']}"
        )
    
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "aprovacao",
        "detalhes": f"Nota aprovada por {current_user['nome']}"
    }
    
    if "historico_alteracoes" not in nota:
        nota["historico_alteracoes"] = []
    nota["historico_alteracoes"].append(historico_entry)
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": {
            "status": "rascunho",  # Volta para rascunho para poder confirmar
            "aprovado_por": current_user["id"],
            "data_aprovacao": datetime.now(timezone.utc).isoformat(),
            "historico_alteracoes": nota["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Nota fiscal aprovada com sucesso"}

@api_router.post("/notas-fiscais/{nota_id}/confirmar")
async def confirmar_nota_fiscal(nota_id: str, current_user: dict = Depends(get_current_user)):
    """
    Confirma nota fiscal e atualiza estoque (com validações robustas)
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    # VALIDAÇÃO: Status deve ser rascunho ou aguardando_aprovacao
    if nota["status"] not in ["rascunho", "aguardando_aprovacao"]:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível confirmar nota com status '{nota['status']}'"
        )
    
    # VALIDAÇÃO: Se aguardando aprovação, só admin/gerente pode confirmar
    if nota["status"] == "aguardando_aprovacao":
        if current_user["papel"] not in ["admin", "gerente"]:
            raise HTTPException(
                status_code=403,
                detail="Notas aguardando aprovação só podem ser confirmadas por administradores ou gerentes"
            )
    
    if nota.get("confirmado", False) or nota["status"] == "confirmada":
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
    
    # Adicionar ao histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "confirmacao",
        "detalhes": "Nota fiscal confirmada e estoque atualizado"
    }
    
    if "historico_alteracoes" not in nota:
        nota["historico_alteracoes"] = []
    nota["historico_alteracoes"].append(historico_entry)
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": {
            "confirmado": True,
            "status": "confirmada",
            "historico_alteracoes": nota["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="notas_fiscais",
        acao="confirmar",
        detalhes={"nota_id": nota_id, "numero": nota.get("numero")}
    )
    
    return {"message": "Nota fiscal confirmada e estoque atualizado"}

@api_router.post("/notas-fiscais/{nota_id}/cancelar")
async def cancelar_nota_fiscal(
    nota_id: str,
    cancelamento: CancelarNotaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela uma nota fiscal (diferente de excluir) com justificativa
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    if nota.get("cancelada", False):
        raise HTTPException(status_code=400, detail="Nota fiscal já está cancelada")
    
    # Se já foi confirmada, reverter estoque
    if nota.get("confirmado", False) or nota["status"] == "confirmada":
        for item in nota.get("itens", []):
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] - item["quantidade"]
                if novo_estoque < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cancelamento resultaria em estoque negativo para produto '{produto['nome']}'"
                    )
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
                
                # Registrar movimentação de cancelamento
                movimentacao = MovimentacaoEstoque(
                    produto_id=item["produto_id"],
                    tipo="saida",
                    quantidade=item["quantidade"],
                    referencia_tipo="cancelamento_nota_fiscal",
                    referencia_id=nota_id,
                    user_id=current_user["id"]
                )
                await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Adicionar ao histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "cancelamento",
        "detalhes": f"Motivo: {cancelamento.motivo}"
    }
    
    if "historico_alteracoes" not in nota:
        nota["historico_alteracoes"] = []
    nota["historico_alteracoes"].append(historico_entry)
    
    await db.notas_fiscais.update_one(
        {"id": nota_id},
        {"$set": {
            "cancelada": True,
            "status": "cancelada",
            "motivo_cancelamento": cancelamento.motivo,
            "cancelada_por": current_user["id"],
            "data_cancelamento": datetime.now(timezone.utc).isoformat(),
            "historico_alteracoes": nota["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="notas_fiscais",
        acao="cancelar",
        detalhes={
            "nota_id": nota_id,
            "numero": nota.get("numero"),
            "motivo": cancelamento.motivo
        }
    )
    
    return {"message": "Nota fiscal cancelada com sucesso"}

@api_router.get("/notas-fiscais/{nota_id}/historico")
async def get_historico_nota(nota_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retorna o histórico completo de alterações da nota fiscal
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    return {
        "nota_id": nota_id,
        "numero": nota.get("numero"),
        "serie": nota.get("serie"),
        "status": nota.get("status"),
        "historico": nota.get("historico_alteracoes", [])
    }

@api_router.delete("/notas-fiscais/{nota_id}")
async def delete_nota_fiscal(nota_id: str, current_user: dict = Depends(get_current_user)):
    """
    Exclui nota fiscal (apenas rascunhos ou com autorização)
    """
    nota = await db.notas_fiscais.find_one({"id": nota_id}, {"_id": 0})
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    # VALIDAÇÃO: Não pode excluir notas confirmadas ou canceladas
    if nota["status"] in ["confirmada", "cancelada"]:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir nota com status '{nota['status']}'. Use o cancelamento."
        )
    
    # Se a nota foi confirmada anteriormente, reverter o estoque
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
        detalhes={"nota_id": nota_id, "numero": nota.get("numero"), "status": nota.get("status")}
    )
    
    return {"message": "Nota fiscal excluída com sucesso"}

@api_router.get("/relatorios/notas-fiscais")
async def relatorio_notas_fiscais(
    data_inicio: str = None,
    data_fim: str = None,
    fornecedor_id: str = None,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de notas fiscais com filtros
    """
    filtro = {}
    
    if data_inicio and data_fim:
        filtro["data_emissao"] = {"$gte": data_inicio, "$lte": data_fim}
    
    if fornecedor_id:
        filtro["fornecedor_id"] = fornecedor_id
    
    if status:
        filtro["status"] = status
    
    notas = await db.notas_fiscais.find(filtro, {"_id": 0}).to_list(5000)
    
    # Estatísticas
    total_notas = len(notas)
    valor_total = sum(n["valor_total"] for n in notas)
    
    # Por status
    por_status = {}
    for nota in notas:
        st = nota["status"]
        if st not in por_status:
            por_status[st] = {"quantidade": 0, "valor": 0}
        por_status[st]["quantidade"] += 1
        por_status[st]["valor"] += nota["valor_total"]
    
    # Por fornecedor
    por_fornecedor = {}
    for nota in notas:
        forn_id = nota["fornecedor_id"]
        if forn_id not in por_fornecedor:
            por_fornecedor[forn_id] = {"quantidade": 0, "valor": 0}
        por_fornecedor[forn_id]["quantidade"] += 1
        por_fornecedor[forn_id]["valor"] += nota["valor_total"]
    
    # Total de impostos
    total_impostos = {
        "icms": sum(n.get("icms", 0) for n in notas),
        "ipi": sum(n.get("ipi", 0) for n in notas),
        "pis": sum(n.get("pis", 0) for n in notas),
        "cofins": sum(n.get("cofins", 0) for n in notas)
    }
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "total_notas": total_notas,
        "valor_total": valor_total,
        "por_status": por_status,
        "por_fornecedor": por_fornecedor,
        "total_impostos": total_impostos,
        "notas": notas[:100]  # Limitar a 100 notas na resposta
    }

# ========== ORÇAMENTOS ==========

# ========== ORÇAMENTOS ==========

# Configurações
DIAS_VALIDADE_PADRAO = 7
PERCENTUAL_DESCONTO_APROVACAO = 10.0  # Acima de 10% precisa aprovação

def calcular_data_validade(dias: int) -> str:
    """Calcula data de validade a partir de hoje"""
    return (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat()

def calcular_margem_lucro(itens: List[dict], produtos_db) -> float:
    """Calcula margem de lucro do orçamento"""
    custo_total = 0
    receita_total = 0
    
    for item in itens:
        produto = next((p for p in produtos_db if p["id"] == item["produto_id"]), None)
        if produto:
            custo_total += item["quantidade"] * produto.get("preco_custo", 0)
            receita_total += item["quantidade"] * item["preco_unitario"]
    
    if receita_total == 0:
        return 0
    
    return ((receita_total - custo_total) / receita_total) * 100

@api_router.get("/orcamentos", response_model=List[Orcamento])
async def get_orcamentos(
    status: str = None,
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista orçamentos com filtros"""
    filtro = {}
    if status:
        filtro["status"] = status
    if cliente_id:
        filtro["cliente_id"] = cliente_id
    
    orcamentos = await db.orcamentos.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orcamentos

@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orcamento_data: OrcamentoCreate, current_user: dict = Depends(get_current_user)):
    """
    Cria orçamento com validações robustas
    """
    # Validar cliente
    cliente = await db.clientes.find_one({"id": orcamento_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Validar estoque antes de criar o orçamento
    orcamentos_abertos = await db.orcamentos.find({"status": {"$in": ["aberto", "aprovado"]}}, {"_id": 0}).to_list(1000)
    
    produtos_db = []
    for item in orcamento_data.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
        
        if produto.get("status") == "inativo":
            raise HTTPException(status_code=400, detail=f"Produto '{produto['nome']}' está inativo")
        
        produtos_db.append(produto)
        
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
                detail=f"Estoque insuficiente para '{produto['nome']}'. Disponível: {estoque_disponivel}"
            )
    
    # Calcular valores
    subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in orcamento_data.itens)
    desconto_percentual = (orcamento_data.desconto / subtotal * 100) if subtotal > 0 else 0
    total = subtotal - orcamento_data.desconto + orcamento_data.frete
    margem_lucro = calcular_margem_lucro(orcamento_data.itens, produtos_db)
    
    # Verificar se precisa aprovação por desconto
    requer_aprovacao = desconto_percentual > PERCENTUAL_DESCONTO_APROVACAO
    status_inicial = "em_analise" if requer_aprovacao else "aberto"
    
    # Calcular data de validade
    data_validade = calcular_data_validade(orcamento_data.dias_validade)
    
    orcamento = Orcamento(
        cliente_id=orcamento_data.cliente_id,
        itens=orcamento_data.itens,
        desconto=orcamento_data.desconto,
        desconto_percentual=desconto_percentual,
        frete=orcamento_data.frete,
        subtotal=subtotal,
        total=total,
        margem_lucro=margem_lucro,
        status=status_inicial,
        data_validade=data_validade,
        dias_validade=orcamento_data.dias_validade,
        observacoes=orcamento_data.observacoes,
        observacoes_vendedor=orcamento_data.observacoes_vendedor,
        requer_aprovacao=requer_aprovacao,
        user_id=current_user["id"],
        criado_por_nome=current_user["nome"],
        historico_alteracoes=[{
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "criacao",
            "detalhes": f"Orçamento criado com status '{status_inicial}'"
        }]
    )
    
    await db.orcamentos.insert_one(orcamento.model_dump())
    
    # Reservar estoque se aprovado ou aberto
    if status_inicial in ["aberto", "aprovado"]:
        for item in orcamento.itens:
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] - item["quantidade"]
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="orcamentos",
        acao="criar",
        detalhes={
            "orcamento_id": orcamento.id,
            "cliente": cliente["nome"],
            "total": total,
            "status": status_inicial,
            "requer_aprovacao": requer_aprovacao
        }
    )
    
    return orcamento

@api_router.put("/orcamentos/{orcamento_id}")
async def update_orcamento(
    orcamento_id: str,
    orcamento_data: OrcamentoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Edita orçamento (apenas rascunho, em_analise ou aberto)
    """
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Validar status
    if orcamento["status"] not in ["rascunho", "em_analise", "aberto"]:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível editar orçamento com status '{orcamento['status']}'"
        )
    
    # Preparar dados
    update_data = {k: v for k, v in orcamento_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    # Se alterou itens, recalcular tudo
    if "itens" in update_data:
        produtos_db = []
        for item in update_data["itens"]:
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                produtos_db.append(produto)
        
        subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in update_data["itens"])
        desconto = update_data.get("desconto", orcamento.get("desconto", 0))
        frete = update_data.get("frete", orcamento.get("frete", 0))
        
        update_data["subtotal"] = subtotal
        update_data["total"] = subtotal - desconto + frete
        update_data["margem_lucro"] = calcular_margem_lucro(update_data["itens"], produtos_db)
        
        if subtotal > 0:
            update_data["desconto_percentual"] = (desconto / subtotal * 100)
    
    # Registrar alterações no histórico
    alteracoes = []
    for campo, novo_valor in update_data.items():
        if campo not in ["historico_alteracoes", "updated_at"]:
            valor_antigo = orcamento.get(campo)
            if valor_antigo != novo_valor:
                alteracoes.append(f"{campo}: {valor_antigo} → {novo_valor}")
    
    if alteracoes:
        historico_entry = {
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "edicao",
            "detalhes": "; ".join(alteracoes)
        }
        
        if "historico_alteracoes" not in orcamento:
            orcamento["historico_alteracoes"] = []
        orcamento["historico_alteracoes"].append(historico_entry)
        update_data["historico_alteracoes"] = orcamento["historico_alteracoes"]
        
        # Incrementar versão
        update_data["versao"] = orcamento.get("versao", 1) + 1
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": update_data}
    )
    
    return {"message": "Orçamento atualizado com sucesso", "alteracoes": alteracoes}

@api_router.post("/orcamentos/{orcamento_id}/solicitar-aprovacao")
async def solicitar_aprovacao_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    """Solicita aprovação para orçamento em rascunho"""
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento["status"] != "rascunho":
        raise HTTPException(status_code=400, detail="Apenas orçamentos em rascunho podem solicitar aprovação")
    
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "solicitacao_aprovacao",
        "detalhes": "Orçamento enviado para aprovação"
    }
    
    if "historico_alteracoes" not in orcamento:
        orcamento["historico_alteracoes"] = []
    orcamento["historico_alteracoes"].append(historico_entry)
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {
            "status": "em_analise",
            "historico_alteracoes": orcamento["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Orçamento enviado para aprovação"}

@api_router.post("/orcamentos/{orcamento_id}/aprovar")
async def aprovar_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    """Aprova orçamento (apenas admin/gerente)"""
    if current_user["papel"] not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Apenas administradores e gerentes podem aprovar orçamentos")
    
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento["status"] != "em_analise":
        raise HTTPException(status_code=400, detail="Apenas orçamentos em análise podem ser aprovados")
    
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "aprovacao",
        "detalhes": f"Orçamento aprovado por {current_user['nome']}"
    }
    
    if "historico_alteracoes" not in orcamento:
        orcamento["historico_alteracoes"] = []
    orcamento["historico_alteracoes"].append(historico_entry)
    
    # Reservar estoque ao aprovar
    for item in orcamento["itens"]:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] - item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {
            "status": "aberto",
            "aprovado": True,
            "aprovado_por": current_user["id"],
            "data_aprovacao": datetime.now(timezone.utc).isoformat(),
            "historico_alteracoes": orcamento["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Orçamento aprovado com sucesso"}

@api_router.post("/orcamentos/{orcamento_id}/converter-venda")
async def converter_orcamento_venda(
    orcamento_id: str,
    conversao: ConversaoVendaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Converte orçamento em venda com possibilidade de editar desconto/frete
    """
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Validar status
    if orcamento["status"] not in ["aberto", "aprovado"]:
        raise HTTPException(
            status_code=400,
            detail=f"Apenas orçamentos abertos ou aprovados podem ser convertidos. Status atual: {orcamento['status']}"
        )
    
    # Validar se não expirou
    data_validade = datetime.fromisoformat(orcamento["data_validade"])
    if data_validade < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Orçamento expirado. Não pode ser convertido.")
    
    # REVALIDAR ESTOQUE (pode ter vendido para outro)
    orcamentos_abertos = await db.orcamentos.find(
        {"status": {"$in": ["aberto", "aprovado"]}, "id": {"$ne": orcamento_id}},
        {"_id": 0}
    ).to_list(1000)
    
    for item in orcamento["itens"]:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
        
        estoque_atual = produto.get("estoque_atual", 0)
        
        # Calcular estoque reservado (SEM contar este orçamento)
        estoque_reservado = 0
        for orc in orcamentos_abertos:
            for orc_item in orc.get("itens", []):
                if orc_item.get("produto_id") == item["produto_id"]:
                    estoque_reservado += orc_item.get("quantidade", 0)
        
        # Este orçamento já tem estoque reservado, então precisa ter pelo menos a quantidade dele
        estoque_necessario = item["quantidade"]
        estoque_disponivel_total = estoque_atual + estoque_necessario  # Somar o que já está reservado por este
        
        if estoque_disponivel_total - estoque_reservado < estoque_necessario:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para '{produto['nome']}'. Estoque foi vendido para outro cliente."
            )
    
    # Usar novo desconto/frete se fornecido, senão usar do orçamento
    desconto_final = conversao.desconto if conversao.desconto is not None else orcamento["desconto"]
    frete_final = conversao.frete if conversao.frete is not None else orcamento["frete"]
    
    # Recalcular total
    subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in orcamento["itens"])
    total_final = subtotal - desconto_final + frete_final
    
    # Criar venda
    venda = Venda(
        cliente_id=orcamento["cliente_id"],
        itens=orcamento["itens"],
        desconto=desconto_final,
        frete=frete_final,
        total=total_final,
        forma_pagamento=conversao.forma_pagamento,
        orcamento_id=orcamento_id,
        user_id=current_user["id"]
    )
    
    await db.vendas.insert_one(venda.model_dump())
    
    # Registrar movimentações (já está reservado, então não precisa descontar novamente do estoque)
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
    
    # Adicionar ao histórico do orçamento
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "conversao_venda",
        "detalhes": f"Convertido em venda {venda.id}. Desconto: R$ {desconto_final:.2f}, Frete: R$ {frete_final:.2f}"
    }
    
    if "historico_alteracoes" not in orcamento:
        orcamento["historico_alteracoes"] = []
    orcamento["historico_alteracoes"].append(historico_entry)
    
    # Atualizar status do orçamento
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {
            "status": "vendido",
            "historico_alteracoes": orcamento["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="orcamentos",
        acao="converter_venda",
        detalhes={
            "orcamento_id": orcamento_id,
            "venda_id": venda.id,
            "desconto_alterado": desconto_final != orcamento["desconto"],
            "frete_alterado": frete_final != orcamento["frete"]
        }
    )
    
    return {
        "message": "Orçamento convertido em venda com sucesso",
        "venda_id": venda.id,
        "total_venda": total_final,
        "alteracoes": {
            "desconto_original": orcamento["desconto"],
            "desconto_final": desconto_final,
            "frete_original": orcamento["frete"],
            "frete_final": frete_final
        }
    }

@api_router.post("/orcamentos/{orcamento_id}/duplicar")
async def duplicar_orcamento(
    orcamento_id: str,
    duplicacao: DuplicarOrcamentoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Duplica orçamento (cria cópia)"""
    orcamento_original = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento_original:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Cliente para o novo orçamento
    novo_cliente_id = duplicacao.novo_cliente_id if duplicacao.novo_cliente_id else orcamento_original["cliente_id"]
    
    # Validar cliente
    cliente = await db.clientes.find_one({"id": novo_cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Criar novo orçamento
    novo_id = str(uuid.uuid4())
    data_validade = calcular_data_validade(orcamento_original.get("dias_validade", DIAS_VALIDADE_PADRAO))
    
    novo_orcamento = {
        **orcamento_original,
        "id": novo_id,
        "cliente_id": novo_cliente_id,
        "status": "rascunho",
        "orcamento_original_id": orcamento_id,
        "versao": 1,
        "data_validade": data_validade,
        "aprovado": False,
        "aprovado_por": None,
        "data_aprovacao": None,
        "perdido": False,
        "motivo_perda": None,
        "user_id": current_user["id"],
        "criado_por_nome": current_user["nome"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "historico_alteracoes": [{
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "duplicacao",
            "detalhes": f"Duplicado do orçamento {orcamento_id}"
        }]
    }
    
    # Remover _id se existir
    novo_orcamento.pop("_id", None)
    
    await db.orcamentos.insert_one(novo_orcamento)
    
    return {
        "message": "Orçamento duplicado com sucesso",
        "novo_orcamento_id": novo_id,
        "cliente": cliente["nome"]
    }

@api_router.post("/orcamentos/{orcamento_id}/marcar-perdido")
async def marcar_orcamento_perdido(
    orcamento_id: str,
    perda: MarcarPerdidoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Marca orçamento como perdido com motivo"""
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento["status"] not in ["aberto", "aprovado", "em_analise"]:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível marcar como perdido orçamento com status '{orcamento['status']}'"
        )
    
    # Devolver estoque se estava reservado
    if orcamento["status"] in ["aberto", "aprovado"]:
        for item in orcamento["itens"]:
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] + item["quantidade"]
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
    
    # Adicionar ao histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "marcado_perdido",
        "detalhes": f"Motivo: {perda.motivo}"
    }
    
    if "historico_alteracoes" not in orcamento:
        orcamento["historico_alteracoes"] = []
    orcamento["historico_alteracoes"].append(historico_entry)
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {
            "status": "perdido",
            "perdido": True,
            "motivo_perda": perda.motivo,
            "data_perda": datetime.now(timezone.utc).isoformat(),
            "historico_alteracoes": orcamento["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Orçamento marcado como perdido"}

@api_router.post("/orcamentos/verificar-expirados")
async def verificar_orcamentos_expirados(current_user: dict = Depends(get_current_user)):
    """
    Job para verificar e marcar orçamentos expirados
    (Apenas admin pode executar manualmente, mas pode ser agendado)
    """
    if current_user["papel"] != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    
    # Buscar orçamentos abertos ou aprovados
    orcamentos = await db.orcamentos.find(
        {"status": {"$in": ["aberto", "aprovado", "em_analise"]}},
        {"_id": 0}
    ).to_list(5000)
    
    expirados = 0
    agora = datetime.now(timezone.utc)
    
    for orcamento in orcamentos:
        data_validade = datetime.fromisoformat(orcamento["data_validade"])
        
        if data_validade < agora:
            # Devolver estoque
            for item in orcamento["itens"]:
                produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
                if produto:
                    novo_estoque = produto["estoque_atual"] + item["quantidade"]
                    await db.produtos.update_one(
                        {"id": item["produto_id"]},
                        {"$set": {"estoque_atual": novo_estoque}}
                    )
            
            # Marcar como expirado
            historico_entry = {
                "data": agora.isoformat(),
                "usuario": "Sistema",
                "acao": "expiracao_automatica",
                "detalhes": "Orçamento expirado automaticamente"
            }
            
            if "historico_alteracoes" not in orcamento:
                orcamento["historico_alteracoes"] = []
            orcamento["historico_alteracoes"].append(historico_entry)
            
            await db.orcamentos.update_one(
                {"id": orcamento["id"]},
                {"$set": {
                    "status": "expirado",
                    "historico_alteracoes": orcamento["historico_alteracoes"],
                    "updated_at": agora.isoformat()
                }}
            )
            
            expirados += 1
    
    return {
        "message": f"Verificação concluída. {expirados} orçamentos expirados.",
        "expirados": expirados,
        "total_verificados": len(orcamentos)
    }

@api_router.get("/orcamentos/{orcamento_id}/historico")
async def get_historico_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna histórico completo do orçamento"""
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    return {
        "orcamento_id": orcamento_id,
        "cliente_id": orcamento.get("cliente_id"),
        "status": orcamento.get("status"),
        "versao": orcamento.get("versao", 1),
        "historico": orcamento.get("historico_alteracoes", [])
    }

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

# ========== VENDAS ==========

# Configurações
VALOR_MINIMO_AUTORIZACAO_VENDA = 5000.00
LIMITE_DESCONTO_VENDEDOR = 5.0  # 5%
LIMITE_DESCONTO_GERENTE = 15.0  # 15%
TAXA_CARTAO_PADRAO = 3.5  # 3.5%
COMISSAO_VENDEDOR_PADRAO = 2.0  # 2%

async def gerar_proximo_numero_venda() -> str:
    """Gera próximo número sequencial de venda"""
    ultima_venda = await db.vendas.find({}, {"_id": 0, "numero_venda": 1}).sort("created_at", -1).limit(1).to_list(1)
    
    if ultima_venda and "numero_venda" in ultima_venda[0]:
        ultimo_numero = int(ultima_venda[0]["numero_venda"].split("-")[1])
        proximo_numero = ultimo_numero + 1
    else:
        proximo_numero = 1
    
    return f"VEN-{proximo_numero:05d}"

def calcular_parcelas(total: float, numero_parcelas: int, data_base: str = None) -> List[dict]:
    """Calcula parcelas com datas de vencimento"""
    if data_base is None:
        data_base = datetime.now(timezone.utc).isoformat()
    
    valor_parcela = total / numero_parcelas
    parcelas = []
    
    for i in range(numero_parcelas):
        data_vencimento = datetime.fromisoformat(data_base) + timedelta(days=30 * (i + 1))
        parcelas.append({
            "numero": i + 1,
            "valor": valor_parcela,
            "data_vencimento": data_vencimento.isoformat(),
            "data_pagamento": None,
            "status": "pendente",
            "juros": 0,
            "multa": 0
        })
    
    return parcelas

@api_router.get("/vendas/proximo-numero")
async def get_proximo_numero_venda(current_user: dict = Depends(get_current_user)):
    """Retorna o próximo número de venda disponível"""
    proximo = await gerar_proximo_numero_venda()
    return {"proximo_numero": proximo}

@api_router.get("/vendas", response_model=List[Venda])
async def get_vendas(
    status_venda: str = None,
    status_entrega: str = None,
    cliente_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista vendas com filtros"""
    filtro = {}
    if status_venda:
        filtro["status_venda"] = status_venda
    if status_entrega:
        filtro["status_entrega"] = status_entrega
    if cliente_id:
        filtro["cliente_id"] = cliente_id
    
    vendas = await db.vendas.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return vendas

@api_router.post("/vendas", response_model=Venda)
async def create_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    """
    Cria venda com validações completas e controle de pagamento
    """
    # Validar cliente
    cliente = await db.clientes.find_one({"id": venda_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Validar estoque antes de criar a venda
    orcamentos_abertos = await db.orcamentos.find(
        {"status": {"$in": ["aberto", "aprovado"]}}, 
        {"_id": 0}
    ).to_list(1000)
    
    produtos_db = []
    for item in venda_data.itens:
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
        
        if produto.get("status") == "inativo":
            raise HTTPException(status_code=400, detail=f"Produto '{produto['nome']}' está inativo")
        
        produtos_db.append(produto)
        
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
                detail=f"Estoque insuficiente para '{produto['nome']}'. Disponível: {estoque_disponivel}"
            )
    
    # Calcular valores
    subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in venda_data.itens)
    desconto_percentual = (venda_data.desconto / subtotal * 100) if subtotal > 0 else 0
    
    # VALIDAÇÃO: Limite de desconto por papel
    papel = current_user["papel"]
    if papel == "vendedor" and desconto_percentual > LIMITE_DESCONTO_VENDEDOR:
        raise HTTPException(
            status_code=403,
            detail=f"Vendedor pode dar no máximo {LIMITE_DESCONTO_VENDEDOR}% de desconto. Desconto solicitado: {desconto_percentual:.2f}%"
        )
    elif papel == "gerente" and desconto_percentual > LIMITE_DESCONTO_GERENTE:
        raise HTTPException(
            status_code=403,
            detail=f"Gerente pode dar no máximo {LIMITE_DESCONTO_GERENTE}% de desconto. Desconto solicitado: {desconto_percentual:.2f}%"
        )
    
    # Calcular taxa de cartão
    taxa_cartao = 0
    taxa_cartao_percentual = 0
    if venda_data.forma_pagamento == "cartao":
        taxa_cartao_percentual = TAXA_CARTAO_PADRAO
        taxa_cartao = subtotal * (taxa_cartao_percentual / 100)
    
    total = subtotal - venda_data.desconto + venda_data.frete
    
    # Verificar se precisa autorização por valor
    requer_autorizacao = total >= VALOR_MINIMO_AUTORIZACAO_VENDA and papel == "vendedor"
    status_inicial = "aguardando_pagamento" if not requer_autorizacao else "rascunho"
    
    # Gerar número sequencial
    numero_venda = await gerar_proximo_numero_venda()
    
    # Calcular comissão
    comissao_percentual = COMISSAO_VENDEDOR_PADRAO
    comissao_vendedor = total * (comissao_percentual / 100)
    
    # Gerar parcelas
    parcelas = calcular_parcelas(total, venda_data.numero_parcelas)
    valor_parcela = total / venda_data.numero_parcelas
    
    # Determinar saldo pendente
    valor_pago = 0
    saldo_pendente = total
    
    venda = Venda(
        numero_venda=numero_venda,
        cliente_id=venda_data.cliente_id,
        itens=venda_data.itens,
        desconto=venda_data.desconto,
        desconto_percentual=desconto_percentual,
        frete=venda_data.frete,
        subtotal=subtotal,
        total=total,
        forma_pagamento=venda_data.forma_pagamento,
        numero_parcelas=venda_data.numero_parcelas,
        valor_parcela=valor_parcela,
        parcelas=parcelas,
        taxa_cartao=taxa_cartao,
        taxa_cartao_percentual=taxa_cartao_percentual,
        valor_pago=valor_pago,
        saldo_pendente=saldo_pendente,
        comissao_vendedor=comissao_vendedor,
        comissao_percentual=comissao_percentual,
        status_venda=status_inicial,
        observacoes=venda_data.observacoes,
        observacoes_vendedor=venda_data.observacoes_vendedor,
        requer_autorizacao=requer_autorizacao,
        orcamento_id=venda_data.orcamento_id,
        user_id=current_user["id"],
        vendedor_nome=current_user["nome"],
        historico_alteracoes=[{
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "criacao",
            "detalhes": f"Venda {numero_venda} criada com status '{status_inicial}'"
        }]
    )
    
    await db.vendas.insert_one(venda.model_dump())
    
    # Baixar estoque e registrar movimentações (apenas se não precisa autorização)
    if not requer_autorizacao:
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
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="vendas",
        acao="criar",
        detalhes={
            "venda_id": venda.id,
            "numero_venda": numero_venda,
            "cliente": cliente["nome"],
            "total": total,
            "requer_autorizacao": requer_autorizacao
        }
    )
    
    return venda

@api_router.put("/vendas/{venda_id}")
async def update_venda(
    venda_id: str,
    venda_data: VendaUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Edita venda (apenas rascunho ou aguardando_pagamento)
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Validar status
    if venda["status_venda"] not in ["rascunho", "aguardando_pagamento"]:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível editar venda com status '{venda['status_venda']}'"
        )
    
    # Preparar dados
    update_data = {k: v for k, v in venda_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    # Se alterou itens, recalcular tudo
    if "itens" in update_data:
        subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in update_data["itens"])
        desconto = update_data.get("desconto", venda.get("desconto", 0))
        frete = update_data.get("frete", venda.get("frete", 0))
        
        update_data["subtotal"] = subtotal
        update_data["total"] = subtotal - desconto + frete
        update_data["saldo_pendente"] = update_data["total"] - venda.get("valor_pago", 0)
        
        if subtotal > 0:
            update_data["desconto_percentual"] = (desconto / subtotal * 100)
    
    # Registrar alterações
    alteracoes = []
    for campo, novo_valor in update_data.items():
        if campo not in ["historico_alteracoes", "updated_at"]:
            valor_antigo = venda.get(campo)
            if valor_antigo != novo_valor:
                alteracoes.append(f"{campo}: {valor_antigo} → {novo_valor}")
    
    if alteracoes:
        historico_entry = {
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "edicao",
            "detalhes": "; ".join(alteracoes)
        }
        
        if "historico_alteracoes" not in venda:
            venda["historico_alteracoes"] = []
        venda["historico_alteracoes"].append(historico_entry)
        update_data["historico_alteracoes"] = venda["historico_alteracoes"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": update_data}
    )
    
    return {"message": "Venda atualizada com sucesso", "alteracoes": alteracoes}

@api_router.post("/vendas/{venda_id}/registrar-pagamento")
async def registrar_pagamento(
    venda_id: str,
    pagamento: RegistrarPagamentoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra pagamento total ou parcial da venda
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda["status_venda"] == "cancelada":
        raise HTTPException(status_code=400, detail="Não é possível registrar pagamento em venda cancelada")
    
    valor_pago_atual = venda.get("valor_pago", 0)
    saldo_pendente = venda.get("saldo_pendente", venda["total"])
    
    if pagamento.valor > saldo_pendente:
        raise HTTPException(
            status_code=400,
            detail=f"Valor de pagamento (R$ {pagamento.valor:.2f}) maior que saldo pendente (R$ {saldo_pendente:.2f})"
        )
    
    novo_valor_pago = valor_pago_atual + pagamento.valor
    novo_saldo = saldo_pendente - pagamento.valor
    
    # Determinar novo status
    if novo_saldo == 0:
        novo_status = "paga"
    elif novo_valor_pago > 0:
        novo_status = "parcialmente_paga"
    else:
        novo_status = venda["status_venda"]
    
    # Atualizar parcela se especificado
    parcelas = venda.get("parcelas", [])
    if pagamento.parcela_numero and parcelas:
        for parcela in parcelas:
            if parcela["numero"] == pagamento.parcela_numero:
                parcela["status"] = "paga"
                parcela["data_pagamento"] = pagamento.data_pagamento or datetime.now(timezone.utc).isoformat()
    
    # Histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "pagamento",
        "detalhes": f"Pagamento de R$ {pagamento.valor:.2f}. Novo saldo: R$ {novo_saldo:.2f}"
    }
    
    if "historico_alteracoes" not in venda:
        venda["historico_alteracoes"] = []
    venda["historico_alteracoes"].append(historico_entry)
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "valor_pago": novo_valor_pago,
            "saldo_pendente": novo_saldo,
            "status_venda": novo_status,
            "data_pagamento": pagamento.data_pagamento or datetime.now(timezone.utc).isoformat(),
            "parcelas": parcelas,
            "historico_alteracoes": venda["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Pagamento registrado com sucesso",
        "valor_pago": novo_valor_pago,
        "saldo_pendente": novo_saldo,
        "status_venda": novo_status
    }

@api_router.post("/vendas/{venda_id}/cancelar")
async def cancelar_venda(
    venda_id: str,
    cancelamento: CancelarVendaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela venda formalmente (diferente de excluir) com motivo
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get("cancelada", False):
        raise HTTPException(status_code=400, detail="Venda já está cancelada")
    
    # Devolver estoque
    for item in venda.get("itens", []):
        produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] + item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
            
            movimentacao = MovimentacaoEstoque(
                produto_id=item["produto_id"],
                tipo="entrada",
                quantidade=item["quantidade"],
                referencia_tipo="cancelamento_venda",
                referencia_id=venda_id,
                user_id=current_user["id"]
            )
            await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
    
    # Histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "cancelamento",
        "detalhes": f"Motivo: {cancelamento.motivo}"
    }
    
    if "historico_alteracoes" not in venda:
        venda["historico_alteracoes"] = []
    venda["historico_alteracoes"].append(historico_entry)
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "cancelada": True,
            "status_venda": "cancelada",
            "motivo_cancelamento": cancelamento.motivo,
            "cancelada_por": current_user["id"],
            "data_cancelamento": datetime.now(timezone.utc).isoformat(),
            "historico_alteracoes": venda["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="vendas",
        acao="cancelar",
        detalhes={
            "venda_id": venda_id,
            "numero_venda": venda.get("numero_venda"),
            "motivo": cancelamento.motivo
        }
    )
    
    return {"message": "Venda cancelada com sucesso"}

@api_router.post("/vendas/{venda_id}/devolucao-parcial")
async def devolucao_parcial(
    venda_id: str,
    devolucao: DevolucaoParcialRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Devolve apenas alguns itens da venda (não a venda toda)
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda["status_venda"] == "cancelada":
        raise HTTPException(status_code=400, detail="Não é possível devolver itens de venda cancelada")
    
    valor_devolver = 0
    itens_devolvidos_novos = []
    
    # Validar e calcular valor a devolver
    for item_dev in devolucao.itens_devolver:
        item_original = next((i for i in venda["itens"] if i["produto_id"] == item_dev["produto_id"]), None)
        if not item_original:
            raise HTTPException(
                status_code=404,
                detail=f"Produto {item_dev['produto_id']} não encontrado na venda"
            )
        
        # Verificar se quantidade já não foi devolvida
        quantidade_ja_devolvida = 0
        for dev in venda.get("itens_devolvidos", []):
            if dev["produto_id"] == item_dev["produto_id"]:
                quantidade_ja_devolvida += dev["quantidade"]
        
        quantidade_disponivel = item_original["quantidade"] - quantidade_ja_devolvida
        
        if item_dev["quantidade"] > quantidade_disponivel:
            raise HTTPException(
                status_code=400,
                detail=f"Quantidade a devolver ({item_dev['quantidade']}) maior que disponível ({quantidade_disponivel})"
            )
        
        # Devolver ao estoque
        produto = await db.produtos.find_one({"id": item_dev["produto_id"]}, {"_id": 0})
        if produto:
            novo_estoque = produto["estoque_atual"] + item_dev["quantidade"]
            await db.produtos.update_one(
                {"id": item_dev["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
            
            movimentacao = MovimentacaoEstoque(
                produto_id=item_dev["produto_id"],
                tipo="entrada",
                quantidade=item_dev["quantidade"],
                referencia_tipo="devolucao_parcial",
                referencia_id=venda_id,
                user_id=current_user["id"]
            )
            await db.movimentacoes_estoque.insert_one(movimentacao.model_dump())
        
        # Calcular valor
        valor_item = item_dev["quantidade"] * item_original["preco_unitario"]
        valor_devolver += valor_item
        
        itens_devolvidos_novos.append({
            "produto_id": item_dev["produto_id"],
            "quantidade": item_dev["quantidade"],
            "valor": valor_item,
            "data": datetime.now(timezone.utc).isoformat()
        })
    
    # Atualizar venda
    itens_devolvidos_total = venda.get("itens_devolvidos", []) + itens_devolvidos_novos
    valor_devolvido_total = venda.get("valor_devolvido", 0) + valor_devolver
    
    # Histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "devolucao_parcial",
        "detalhes": f"Devolvidos {len(devolucao.itens_devolver)} itens. Valor: R$ {valor_devolver:.2f}. Motivo: {devolucao.motivo}"
    }
    
    if "historico_alteracoes" not in venda:
        venda["historico_alteracoes"] = []
    venda["historico_alteracoes"].append(historico_entry)
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "devolvida": True,
            "itens_devolvidos": itens_devolvidos_total,
            "valor_devolvido": valor_devolvido_total,
            "historico_alteracoes": venda["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Devolução parcial registrada com sucesso",
        "valor_devolvido": valor_devolver,
        "valor_devolvido_total": valor_devolvido_total
    }

@api_router.post("/vendas/{venda_id}/trocar-produto")
async def trocar_produto(
    venda_id: str,
    troca: TrocaProdutoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra troca de produto (retira um, adiciona outro)
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Validar produtos
    produto_saida = await db.produtos.find_one({"id": troca.produto_saida_id}, {"_id": 0})
    produto_entrada = await db.produtos.find_one({"id": troca.produto_entrada_id}, {"_id": 0})
    
    if not produto_saida or not produto_entrada:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Devolver produto antigo ao estoque
    await db.produtos.update_one(
        {"id": troca.produto_saida_id},
        {"$inc": {"estoque_atual": troca.quantidade_saida}}
    )
    
    # Retirar novo produto do estoque
    if produto_entrada["estoque_atual"] < troca.quantidade_entrada:
        raise HTTPException(status_code=400, detail=f"Estoque insuficiente de '{produto_entrada['nome']}'")
    
    await db.produtos.update_one(
        {"id": troca.produto_entrada_id},
        {"$inc": {"estoque_atual": -troca.quantidade_entrada}}
    )
    
    # Registrar movimentações
    mov_saida = MovimentacaoEstoque(
        produto_id=troca.produto_saida_id,
        tipo="entrada",
        quantidade=troca.quantidade_saida,
        referencia_tipo="troca_produto",
        referencia_id=venda_id,
        user_id=current_user["id"]
    )
    await db.movimentacoes_estoque.insert_one(mov_saida.model_dump())
    
    mov_entrada = MovimentacaoEstoque(
        produto_id=troca.produto_entrada_id,
        tipo="saida",
        quantidade=troca.quantidade_entrada,
        referencia_tipo="troca_produto",
        referencia_id=venda_id,
        user_id=current_user["id"]
    )
    await db.movimentacoes_estoque.insert_one(mov_entrada.model_dump())
    
    # Histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "troca_produto",
        "detalhes": f"Trocado {produto_saida['nome']} por {produto_entrada['nome']}. Motivo: {troca.motivo}"
    }
    
    if "historico_alteracoes" not in venda:
        venda["historico_alteracoes"] = []
    venda["historico_alteracoes"].append(historico_entry)
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "historico_alteracoes": venda["historico_alteracoes"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Troca de produto registrada com sucesso"}

@api_router.put("/vendas/{venda_id}/entrega")
async def atualizar_entrega(
    venda_id: str,
    entrega: AtualizarEntregaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza status de entrega da venda
    """
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    update_data = {
        "status_entrega": entrega.status_entrega,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if entrega.codigo_rastreio:
        update_data["codigo_rastreio"] = entrega.codigo_rastreio
    
    if entrega.observacoes_entrega:
        update_data["observacoes_entrega"] = entrega.observacoes_entrega
    
    if entrega.status_entrega == "entregue":
        update_data["data_entrega"] = datetime.now(timezone.utc).isoformat()
    
    # Histórico
    historico_entry = {
        "data": datetime.now(timezone.utc).isoformat(),
        "usuario": current_user["nome"],
        "acao": "atualizacao_entrega",
        "detalhes": f"Status de entrega alterado para '{entrega.status_entrega}'"
    }
    
    if "historico_alteracoes" not in venda:
        venda["historico_alteracoes"] = []
    venda["historico_alteracoes"].append(historico_entry)
    update_data["historico_alteracoes"] = venda["historico_alteracoes"]
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": update_data}
    )
    
    return {"message": "Status de entrega atualizado com sucesso"}

@api_router.get("/vendas/{venda_id}/historico")
async def get_historico_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna histórico completo da venda"""
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    return {
        "venda_id": venda_id,
        "numero_venda": venda.get("numero_venda"),
        "cliente_id": venda.get("cliente_id"),
        "status_venda": venda.get("status_venda"),
        "status_entrega": venda.get("status_entrega"),
        "historico": venda.get("historico_alteracoes", [])
    }

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
        logs = [log for log in logs if data_inicio <= log["timestamp"][:10] <= data_fim]
    
    if user_id:
        logs = [log for log in logs if log["user_id"] == user_id]
    
    if acao:
        logs = [log for log in logs if log["acao"] == acao]
    
    # Estatísticas
    acoes_por_tipo = {}
    acoes_por_usuario = {}
    acoes_por_tela = {}
    
    for log_item in logs:
        # Por tipo de ação
        acao_tipo = log_item["acao"]
        if acao_tipo not in acoes_por_tipo:
            acoes_por_tipo[acao_tipo] = 0
        acoes_por_tipo[acao_tipo] += 1
        
        # Por usuário
        usuario = log_item["user_nome"]
        if usuario not in acoes_por_usuario:
            acoes_por_usuario[usuario] = 0
        acoes_por_usuario[usuario] += 1
        
        # Por tela
        tela = log_item["tela"]
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