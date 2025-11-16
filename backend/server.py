from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
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
    permissoes: dict  # {"tela": ["ler", "criar", "editar", "deletar"]}

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
    ativo: bool = True
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
    ativo: bool = True
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
    marca_id: str  # Categoria deve pertencer a uma Marca
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    marca_id: str  # Categoria deve pertencer a uma Marca
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

class ProdutoVariante(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    sku_variante: str
    estoque_atual: int = 0
    preco_adicional: float = 0

class ComponenteKit(BaseModel):
    produto_id: str
    quantidade: int

class Produto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    nome: str
    marca_id: str  # Obrigatório
    categoria_id: str  # Obrigatório
    subcategoria_id: str  # Obrigatório
    unidade: str = "UN"
    
    # Preços
    preco_inicial: float  # Informado pelo usuário no cadastro
    preco_medio: float  # Calculado automaticamente (média ponderada das compras)
    preco_ultima_compra: Optional[float] = None  # Preço da última nota fiscal confirmada
    preco_venda: float
    margem_lucro: Optional[float] = None  # Calculado: (preco_venda - preco_medio) / preco_medio * 100
    preco_promocional: Optional[float] = None
    data_inicio_promo: Optional[str] = None
    data_fim_promo: Optional[str] = None
    
    # Estoque
    estoque_atual: int = 0
    estoque_minimo: int = 0
    estoque_maximo: int = 0
    
    # Variações
    tem_variacoes: bool = False
    variacoes: Optional[List[ProdutoVariante]] = None
    
    # Campos adicionais
    codigo_barras: Optional[str] = None
    peso: Optional[float] = None  # em kg
    altura: Optional[float] = None  # em cm
    largura: Optional[float] = None  # em cm
    profundidade: Optional[float] = None  # em cm
    fornecedor_preferencial_id: Optional[str] = None
    comissao_vendedor: Optional[float] = None  # % ou valor fixo
    tags: Optional[List[str]] = None  # ["promoção", "lançamento", "bestseller"]
    em_destaque: bool = False
    
    # Kits
    eh_kit: bool = False
    componentes_kit: Optional[List[ComponenteKit]] = None
    
    # Mídia
    fotos: Optional[List[str]] = None
    foto_principal_index: Optional[int] = 0  # Índice da foto principal na lista
    descricao: Optional[str] = None
    
    # Status
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProdutoCreate(BaseModel):
    sku: str
    nome: str
    marca_id: str  # Obrigatório
    categoria_id: str  # Obrigatório
    subcategoria_id: str  # Obrigatório
    unidade: str = "UN"
    
    # Preços
    preco_inicial: float  # Usuário informa no cadastro
    preco_venda: float
    margem_lucro: Optional[float] = None
    preco_promocional: Optional[float] = None
    data_inicio_promo: Optional[str] = None
    data_fim_promo: Optional[str] = None
    
    # Estoque
    estoque_minimo: int = 0
    estoque_maximo: int = 0
    
    # Variações
    tem_variacoes: bool = False
    variacoes: Optional[List[ProdutoVariante]] = None
    
    # Campos adicionais
    codigo_barras: Optional[str] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    largura: Optional[float] = None
    profundidade: Optional[float] = None
    fornecedor_preferencial_id: Optional[str] = None
    comissao_vendedor: Optional[float] = None
    tags: Optional[List[str]] = None
    em_destaque: bool = False
    
    # Kits
    eh_kit: bool = False
    componentes_kit: Optional[List[ComponenteKit]] = None
    
    # Mídia
    fotos: Optional[List[str]] = None
    descricao: Optional[str] = None
    ativo: bool = True

class HistoricoPreco(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    preco_custo_anterior: float
    preco_custo_novo: float
    preco_venda_anterior: float
    preco_venda_novo: float
    margem_anterior: float
    margem_nova: float
    usuario_id: str
    usuario_nome: str
    data_alteracao: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    motivo: Optional[str] = None

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
    model_config = ConfigDict(extra="allow")  # Mudado de ignore para allow
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    tipo: str  # entrada, saida
    quantidade: int
    referencia_tipo: str  # nota_fiscal, orcamento, venda, devolucao
    referencia_id: str
    user_id: str
    motivo: Optional[str] = None  # Para ajustes manuais
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
    status: str = "rascunho"  # rascunho, em_analise, aprovado, aberto, vendido, devolvido, expirado, perdido, cancelado
    
    # Cancelamento (quando venda vinculada é cancelada)
    motivo_cancelamento: Optional[str] = None
    cancelado_por: Optional[str] = None
    data_cancelamento: Optional[str] = None
    
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
    itens: Optional[List[dict]] = None  # Novos itens (se editados)

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

# Modelos de Inventário
class ItemInventario(BaseModel):
    produto_id: str
    produto_nome: Optional[str] = None
    produto_sku: Optional[str] = None
    estoque_sistema: int
    estoque_contado: Optional[int] = None
    diferenca: Optional[int] = None
    observacao: Optional[str] = None

class Inventario(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "uuid-string",
                "numero": "INV-001",
                "data_inicio": "2024-11-06T10:00:00",
                "status": "em_andamento"
            }
        }
    )
    id: str
    numero: str
    data_inicio: str
    data_conclusao: Optional[str] = None
    status: str  # em_andamento, concluido, cancelado
    responsavel_id: str
    responsavel_nome: Optional[str] = None
    itens: List[ItemInventario]
    total_produtos: int = 0
    total_contados: int = 0
    total_divergencias: int = 0
    observacoes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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


# ========== RBAC MODELS ==========

class Permission(BaseModel):
    """Permissão individual"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    modulo: str  # produtos, vendas, orcamentos, estoque, etc
    acao: str  # criar, ler, editar, deletar, exportar, aprovar
    descricao: Optional[str] = None

class Role(BaseModel):
    """Papel/Função customizável"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    cor: str = "#6B7280"  # Cor hex para UI
    is_sistema: bool = False  # Se é papel padrão do sistema (não pode deletar)
    hierarquia_nivel: int = 99  # Admin=1, Gerente=50, Vendedor=99 (menor = maior poder)
    permissoes: List[str] = []  # Lista de IDs de permissões
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RoleCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: str = "#6B7280"
    hierarquia_nivel: int = 99
    permissoes: List[str] = []

class RoleUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    cor: Optional[str] = None
    hierarquia_nivel: Optional[int] = None
    permissoes: Optional[List[str]] = None

class UserGroup(BaseModel):
    """Grupo de usuários"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    user_ids: List[str] = []
    role_ids: List[str] = []  # Papéis aplicados a todos do grupo
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserGroupCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    user_ids: List[str] = []
    role_ids: List[str] = []

class PermissionHistory(BaseModel):
    """Histórico de mudanças de permissões"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Quem fez a mudança
    user_nome: str
    target_user_id: Optional[str] = None  # Usuário afetado
    target_role_id: Optional[str] = None  # Papel afetado
    acao: str  # role_created, role_updated, role_deleted, permission_added, permission_removed, user_role_changed
    detalhes: dict
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TwoFactorAuth(BaseModel):
    """Configuração de 2FA"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    secret: str
    ativo: bool = False
    backup_codes: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PasswordPolicy(BaseModel):
    """Política de senha"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    min_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    expiration_days: int = 90  # 0 = sem expiração
    prevent_reuse: int = 5  # Quantas senhas antigas impedir reutilização
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30

class TemporaryPermission(BaseModel):
    """Permissão temporária"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    permission_ids: List[str]
    granted_by: str  # ID do usuário que concedeu
    valid_from: str
    valid_until: str
    motivo: str
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PermissionDelegation(BaseModel):
    """Delegação de permissões"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str  # Quem delegou
    to_user_id: str  # Quem recebeu
    permission_ids: List[str]
    valid_from: str
    valid_until: str
    motivo: str
    ativo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSession(BaseModel):
    """Sessão de usuário para controle"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    ip: str
    user_agent: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str
    ativo: bool = True

# Atualizar modelo User para incluir novos campos
class UserExtended(BaseModel):
    """Usuário com suporte completo RBAC"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    nome: str
    senha_hash: str
    role_id: Optional[str] = None  # ID do papel customizável
    papel: str = "vendedor"  # Manter compatibilidade (deprecated)
    grupos: List[str] = []  # IDs dos grupos
    ativo: bool = True
    require_2fa: bool = False
    senha_ultimo_change: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    senha_historia: List[str] = []  # Hashes de senhas antigas
    login_attempts: int = 0
    locked_until: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    papel: Optional[str] = None
    role_id: Optional[str] = None
    ativo: Optional[bool] = None
    require_2fa: Optional[bool] = None


class PasswordResetToken(BaseModel):
    """Token para recuperação de senha"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str  # Token único e aleatório
    expires_at: str
    used: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ip: str = ""

# ========== AUTH UTILS ==========

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_reset_token() -> str:
    """Gera token seguro e aleatório para recuperação de senha"""
    import secrets
    return secrets.token_urlsafe(32)

async def send_password_reset_email(email: str, token: str, user_name: str):
    """Envia email de recuperação de senha"""
    # Para ambiente de produção, implemente com serviço SMTP real
    # Por enquanto, vamos apenas logar o token (NUNCA fazer isso em produção)
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    # TODO: Implementar envio real de email
    # Exemplo com smtplib ou serviço como SendGrid, AWS SES, etc.
    
    # Por enquanto, apenas log para desenvolvimento
    print(f"\n{'='*60}")
    print("PASSWORD RESET REQUEST")
    print(f"{'='*60}")
    print(f"User: {user_name}")
    print(f"Email: {email}")
    print(f"Reset Link: {reset_link}")
    print(f"Token: {token}")
    print(f"{'='*60}\n")
    
    # Log no sistema
    await log_action(
        ip="0.0.0.0",
        user_id="",
        user_nome=user_name,
        
        tela="recuperacao_senha",
        acao="email_enviado",
        severidade="INFO",
        detalhes={"email": email}
    )
    
    return True

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


# ========== RBAC FUNCTIONS ==========

async def get_user_permissions(user_id: str) -> List[dict]:
    """Retorna todas as permissões do usuário (diretas + por papel + por grupo + temporárias)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return []
    
    all_permissions = []
    
    # 1. Permissões por papel
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        if role:
            for perm_id in role.get("permissoes", []):
                perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
                if perm:
                    all_permissions.append(perm)
    
    # 2. Permissões por grupos
    for grupo_id in user.get("grupos", []):
        grupo = await db.user_groups.find_one({"id": grupo_id}, {"_id": 0})
        if grupo:
            for role_id in grupo.get("role_ids", []):
                role = await db.roles.find_one({"id": role_id}, {"_id": 0})
                if role:
                    for perm_id in role.get("permissoes", []):
                        perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
                        if perm:
                            all_permissions.append(perm)
    
    # 3. Permissões temporárias ativas
    now = datetime.now(timezone.utc).isoformat()
    temp_perms = await db.temporary_permissions.find({
        "user_id": user_id,
        "ativo": True,
        "valid_from": {"$lte": now},
        "valid_until": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    for temp in temp_perms:
        for perm_id in temp.get("permission_ids", []):
            perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
            if perm:
                all_permissions.append(perm)
    
    # 4. Permissões delegadas ativas
    delegations = await db.permission_delegations.find({
        "to_user_id": user_id,
        "ativo": True,
        "valid_from": {"$lte": now},
        "valid_until": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    for deleg in delegations:
        for perm_id in deleg.get("permission_ids", []):
            perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
            if perm:
                all_permissions.append(perm)
    
    # Remover duplicatas
    unique_perms = []
    seen_ids = set()
    for perm in all_permissions:
        if perm["id"] not in seen_ids:
            unique_perms.append(perm)
            seen_ids.add(perm["id"])
    
    return unique_perms

async def check_permission(user_id: str, modulo: str, acao: str) -> bool:
    """Verifica se usuário tem permissão específica"""
    # Admin sempre tem tudo
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user and user.get("papel") == "admin":
        return True
    
    permissions = await get_user_permissions(user_id)
    
    for perm in permissions:
        if perm["modulo"] == modulo and perm["acao"] == acao:
            return True
        # Permissão wildcard (*)
        if perm["modulo"] == modulo and perm["acao"] == "*":
            return True
        if perm["modulo"] == "*" and perm["acao"] == acao:
            return True
    
    return False

def require_permission(modulo: str, acao: str):
    """Dependency para verificar permissão"""
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        has_permission = await check_permission(current_user["id"], modulo, acao)
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail=f"Você não tem permissão para '{acao}' em '{modulo}'"
            )
        return current_user
    return permission_checker

async def log_permission_change(
    user_id: str,
    user_nome: str,
    acao: str,
    detalhes: dict,
    target_user_id: str = None,
    target_role_id: str = None
):
    """Registra mudanças de permissões para auditoria"""
    history = PermissionHistory(
        user_id=user_id,
        user_nome=user_nome,
        target_user_id=target_user_id,
        target_role_id=target_role_id,
        acao=acao,
        detalhes=detalhes
    )
    await db.permission_history.insert_one(history.model_dump())

async def validate_password_policy(password: str, policy: PasswordPolicy = None) -> tuple[bool, str]:
    """Valida senha contra política"""
    if not policy:
        # Política padrão
        policy = PasswordPolicy()
    
    if len(password) < policy.min_length:
        return False, f"Senha deve ter pelo menos {policy.min_length} caracteres"
    
    if policy.require_uppercase and not any(c.isupper() for c in password):
        return False, "Senha deve conter pelo menos uma letra maiúscula"
    
    if policy.require_lowercase and not any(c.islower() for c in password):
        return False, "Senha deve conter pelo menos uma letra minúscula"
    
    if policy.require_numbers and not any(c.isdigit() for c in password):
        return False, "Senha deve conter pelo menos um número"
    
    if policy.require_special_chars:
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            return False, "Senha deve conter pelo menos um caractere especial"
    
    return True, "Senha válida"

async def initialize_default_roles_and_permissions():
    """Inicializa papéis e permissões padrão do sistema"""
    # Verificar se já existem
    existing_roles = await db.roles.count_documents({})
    if existing_roles > 0:
        return
    
    # Criar permissões padrão
    modulos = [
        "dashboard", "produtos", "categorias", "subcategorias", "marcas",
        "clientes", "fornecedores", "estoque", "notas_fiscais",
        "orcamentos", "vendas", "relatorios", "usuarios", "logs", "configuracoes"
    ]
    
    acoes = ["ler", "criar", "editar", "deletar", "exportar", "aprovar"]
    
    permission_map = {}
    
    for modulo in modulos:
        for acao in acoes:
            perm = Permission(
                modulo=modulo,
                acao=acao,
                descricao=f"Permissão para {acao} em {modulo}"
            )
            await db.permissions.insert_one(perm.model_dump())
            key = f"{modulo}:{acao}"
            permission_map[key] = perm.id
    
    # Criar papéis padrão
    # 1. Admin - Todas permissões
    all_perm_ids = list(permission_map.values())
    admin_role = Role(
        nome="Administrador",
        descricao="Acesso total ao sistema",
        cor="#EF4444",
        is_sistema=True,
        hierarquia_nivel=1,
        permissoes=all_perm_ids
    )
    await db.roles.insert_one(admin_role.model_dump())
    
    # 2. Gerente - Quase tudo, sem usuários e configurações
    gerente_perms = [
        perm_id for key, perm_id in permission_map.items()
        if not key.startswith("usuarios:") and not key.startswith("configuracoes:")
    ]
    gerente_role = Role(
        nome="Gerente",
        descricao="Gerencia vendas, estoque e relatórios",
        cor="#F59E0B",
        is_sistema=True,
        hierarquia_nivel=50,
        permissoes=gerente_perms
    )
    await db.roles.insert_one(gerente_role.model_dump())
    
    # 3. Vendedor - Apenas vendas e orçamentos
    vendedor_perms = [
        perm_id for key, perm_id in permission_map.items()
        if key.startswith("dashboard:ler") or
           key.startswith("produtos:ler") or
           key.startswith("clientes:") or
           key.startswith("orcamentos:") or
           key.startswith("vendas:") or
           key.startswith("estoque:ler")
    ]
    vendedor_role = Role(
        nome="Vendedor",
        descricao="Cria orçamentos e vendas",
        cor="#10B981",
        is_sistema=True,
        hierarquia_nivel=99,
        permissoes=vendedor_perms
    )
    await db.roles.insert_one(vendedor_role.model_dump())
    
    # 4. Visualizador - Apenas leitura
    visualizador_perms = [
        perm_id for key, perm_id in permission_map.items()
        if ":ler" in key
    ]
    visualizador_role = Role(
        nome="Visualizador",
        descricao="Apenas visualização de dados",
        cor="#6B7280",
        is_sistema=True,
        hierarquia_nivel=100,
        permissoes=visualizador_perms
    )
    await db.roles.insert_one(visualizador_role.model_dump())


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


# ========== AUTH ENDPOINTS ==========

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin, request: Request):
    """Login com proteção contra brute force e logging detalhado"""
    
    # Buscar usuário
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    # Se usuário não existe, retornar erro genérico (não revelar se email existe)
    if not user:
        # Log tentativa de login com email inexistente
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id="",
            user_nome="Desconhecido",
            
            tela="login",
            acao="login_falha",
            severidade="WARNING",
            detalhes={"motivo": "Email não encontrado"}
        )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se conta está bloqueada
    if user.get("locked_until"):
        locked_until = datetime.fromisoformat(user["locked_until"])
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        
        if locked_until > datetime.now(timezone.utc):
            tempo_restante = (locked_until - datetime.now(timezone.utc)).seconds // 60
            await log_action(
                ip=request.client.host if request.client else "0.0.0.0",
                user_id=user["id"],
                user_nome=user["nome"],
                
                tela="login",
                acao="login_bloqueado",
                severidade="SECURITY",
                detalhes={"tempo_restante_minutos": tempo_restante}
            )
            raise HTTPException(
                status_code=403,
                detail=f"Conta bloqueada. Tente novamente em {tempo_restante} minutos."
            )
        else:
            # Desbloquear conta se tempo expirou
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"locked_until": None, "login_attempts": 0}}
            )
            user["login_attempts"] = 0
    
    # Verificar senha
    if not verify_password(login_data.senha, user["senha_hash"]):
        # Incrementar tentativas falhadas
        login_attempts = user.get("login_attempts", 0) + 1
        update_data = {"login_attempts": login_attempts}
        
        # Bloquear após 5 tentativas
        if login_attempts >= 5:
            locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
            update_data["locked_until"] = locked_until.isoformat()
            
            await db.users.update_one({"id": user["id"]}, {"$set": update_data})
            
            # Log de segurança
            await log_action(
                ip=request.client.host if request.client else "0.0.0.0",
                user_id=user["id"],
                user_nome=user["nome"],
                
                tela="login",
                acao="conta_bloqueada",
                severidade="SECURITY",
                detalhes={"tentativas": login_attempts, "bloqueado_ate": locked_until.isoformat()}
            )
            
            raise HTTPException(
                status_code=403,
                detail="Muitas tentativas falhadas. Conta bloqueada por 30 minutos."
            )
        
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
        
        # Log tentativa falhada
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=user["id"],
            user_nome=user["nome"],
            
            tela="login",
            acao="login_falha",
            severidade="WARNING",
            detalhes={"tentativas": login_attempts, "motivo": "Senha incorreta"}
        )
        
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se usuário está ativo
    if not user.get("ativo", True):
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=user["id"],
            user_nome=user["nome"],
            
            tela="login",
            acao="login_usuario_inativo",
            severidade="WARNING",
            detalhes={"motivo": "Usuário inativo"}
        )
        raise HTTPException(status_code=403, detail="Usuário inativo. Entre em contato com o administrador.")
    
    # Verificar se senha expirou (se política estiver ativa)
    senha_ultimo_change = user.get("senha_ultimo_change")
    if senha_ultimo_change:
        last_change = datetime.fromisoformat(senha_ultimo_change)
        if last_change.tzinfo is None:
            last_change = last_change.replace(tzinfo=timezone.utc)
        
        days_since_change = (datetime.now(timezone.utc) - last_change).days
        
        # Política: senha expira em 90 dias (pode ser customizado)
        if days_since_change > 90:
            await log_action(
                ip=request.client.host if request.client else "0.0.0.0",
                user_id=user["id"],
                user_nome=user["nome"],
                
                tela="login",
                acao="senha_expirada",
                severidade="WARNING",
                detalhes={"dias_desde_mudanca": days_since_change}
            )
            raise HTTPException(
                status_code=403,
                detail="Senha expirada. Entre em contato com o administrador para redefinir."
            )
    
    # Resetar tentativas falhadas
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"login_attempts": 0, "locked_until": None}}
    )
    
    # Criar token
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    
    # Registrar sessão
    user_agent = request.headers.get("user-agent", "Unknown")
    session = UserSession(
        user_id=user["id"],
        token=access_token,
        ip=request.client.host if request.client else "0.0.0.0",
        user_agent=user_agent,
        expires_at=(datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Log sucesso
    await log_action(
        ip=request.client.host if request.client else "0.0.0.0",
        user_id=user["id"],
        user_nome=user["nome"],
        
        tela="login",
        acao="login",
        severidade="INFO",
        detalhes={"dispositivo": user_agent[:100]}
    )
    
    # Remover dados sensíveis
    user_data = {k: v for k, v in user.items() if k not in ["senha_hash", "senha_historia", "locked_until"]}
    
    return Token(access_token=access_token, token_type="bearer", user=user_data)

@api_router.post("/auth/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Logout - invalida sessão"""
    
    # Extrair token do header
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    
    if token:
        # Desativar sessão
        await db.user_sessions.update_many(
            {"user_id": current_user["id"], "token": token},
            {"$set": {"ativo": False}}
        )
    
    # Log
    await log_action(
        ip=request.client.host if request.client else "0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        
        tela="login",
        acao="logout",
        severidade="INFO"
    )
    
    return {"message": "Logout realizado com sucesso"}

@api_router.post("/auth/forgot-password")
async def forgot_password(email: EmailStr, request: Request):
    """Solicita redefinição de senha por email"""
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    # Por segurança, sempre retornar sucesso (não revelar se email existe)
    if not user:
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id="",
            user_nome="Desconhecido",
            
            tela="recuperacao_senha",
            acao="solicitacao_email_inexistente",
            severidade="WARNING"
        )
        # Aguardar um pouco para evitar timing attacks
        import asyncio
        await asyncio.sleep(0.5)
        return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}
    
    # Verificar rate limiting (máximo 3 solicitações em 1 hora por usuário)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent_requests = await db.password_reset_tokens.count_documents({
        "user_id": user["id"],
        "created_at": {"$gte": one_hour_ago}
    })
    
    if recent_requests >= 3:
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=user["id"],
            user_nome=user["nome"],
            
            tela="recuperacao_senha",
            acao="rate_limit_excedido",
            severidade="WARNING"
        )
        return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}
    
    # Gerar token único
    token = generate_reset_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    
    # Salvar token no banco
    reset_token = PasswordResetToken(
        user_id=user["id"],
        token=token,
        expires_at=expires_at,
        ip=request.client.host if request.client else "0.0.0.0"
    )
    await db.password_reset_tokens.insert_one(reset_token.model_dump())
    
    # Enviar email
    try:
        await send_password_reset_email(email, token, user["nome"])
        
        # Log sucesso
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=user["id"],
            user_nome=user["nome"],
            
            tela="recuperacao_senha",
            acao="solicitacao_enviada",
            severidade="INFO",
            detalhes={"expires_in_minutes": 30}
        )
    except Exception as e:
        # Log erro mas não revelar ao usuário
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=user["id"],
            user_nome=user["nome"],
            
            tela="recuperacao_senha",
            acao="erro_envio_email",
            severidade="ERROR",
            erro=str(e)
        )
    
    return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}

@api_router.post("/auth/reset-password")
async def reset_password(token: str, new_password: str, request: Request):
    """Redefine senha usando token de recuperação"""
    
    # Buscar token
    reset_token = await db.password_reset_tokens.find_one({"token": token}, {"_id": 0})
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Verificar se já foi usado
    if reset_token.get("used", False):
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=reset_token["user_id"],
            tela="recuperacao_senha",
            acao="token_ja_usado",
            severidade="WARNING"
        )
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Verificar expiração
    expires_at = datetime.fromisoformat(reset_token["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await log_action(
            ip=request.client.host if request.client else "0.0.0.0",
            user_id=reset_token["user_id"],
            tela="recuperacao_senha",
            acao="token_expirado",
            severidade="WARNING"
        )
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Validar nova senha
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    
    # Buscar usuário
    user = await db.users.find_one({"id": reset_token["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se nova senha é diferente das últimas (se histórico existir)
    senha_hash_nova = hash_password(new_password)
    senha_historia = user.get("senha_historia", [])
    
    for old_hash in senha_historia[-5:]:  # Últimas 5 senhas
        if verify_password(new_password, old_hash):
            raise HTTPException(
                status_code=400,
                detail="Não use uma das suas últimas 5 senhas. Escolha uma senha diferente."
            )
    
    # Atualizar senha
    senha_historia.append(user["senha_hash"])
    if len(senha_historia) > 5:
        senha_historia = senha_historia[-5:]  # Manter apenas últimas 5
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "senha_hash": senha_hash_nova,
                "senha_historia": senha_historia,
                "senha_ultimo_change": datetime.now(timezone.utc).isoformat(),
                "login_attempts": 0,
                "locked_until": None
            }
        }
    )
    
    # Marcar token como usado
    await db.password_reset_tokens.update_one(
        {"token": token},
        {"$set": {"used": True}}
    )
    
    # Invalidar todas sessões ativas do usuário
    await db.user_sessions.update_many(
        {"user_id": user["id"]},
        {"$set": {"ativo": False}}
    )
    
    # Log sucesso
    await log_action(
        ip=request.client.host if request.client else "0.0.0.0",
        user_id=user["id"],
        user_nome=user["nome"],
        
        tela="recuperacao_senha",
        acao="senha_redefinida",
        severidade="INFO"
    )
    
    return {"message": "Senha redefinida com sucesso! Faça login com sua nova senha."}

@api_router.get("/auth/validate-reset-token/{token}")
async def validate_reset_token(token: str):
    """Valida se token de recuperação é válido"""
    
    reset_token = await db.password_reset_tokens.find_one({"token": token}, {"_id": 0})
    
    if not reset_token or reset_token.get("used", False):
        return {"valid": False, "message": "Token inválido ou já utilizado"}
    
    expires_at = datetime.fromisoformat(reset_token["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return {"valid": False, "message": "Token expirado"}
    
    # Buscar usuário para retornar email (parcialmente oculto)
    user = await db.users.find_one({"id": reset_token["user_id"]}, {"_id": 0})
    if not user:
        return {"valid": False, "message": "Usuário não encontrado"}
    
    # Ocultar parte do email por segurança
    email = user["email"]
    parts = email.split("@")
    if len(parts[0]) > 2:
        hidden_email = parts[0][0] + "*" * (len(parts[0]) - 2) + parts[0][-1] + "@" + parts[1]
    else:
        hidden_email = parts[0][0] + "*@" + parts[1]
    
    return {
        "valid": True,
        "email": hidden_email,
        "expires_in_minutes": int((expires_at - datetime.now(timezone.utc)).seconds / 60)
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retorna dados do usuário logado"""
    user_data = {k: v for k, v in current_user.items() if k not in ["senha_hash", "senha_historia", "locked_until"]}
    return user_data

@api_router.get("/auth/sessions")
async def get_my_sessions(current_user: dict = Depends(get_current_user)):
    """Lista sessões ativas do usuário"""
    sessions = await db.user_sessions.find(
        {"user_id": current_user["id"], "ativo": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "total": len(sessions),
        "sessions": sessions
    }

@api_router.post("/auth/sessions/{session_id}/revoke")
async def revoke_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Revoga sessão específica"""
    
    result = await db.user_sessions.update_one(
        {"id": session_id, "user_id": current_user["id"]},
        {"$set": {"ativo": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="sessoes",
        acao="revogar_sessao",
        detalhes={"session_id": session_id}
    )
    
    return {"message": "Sessão revogada com sucesso"}


# ========== USUÁRIOS (ADMIN) ==========

class UserUpdate(BaseModel):
    nome: str
    email: EmailStr
    papel: str
    ativo: bool
    senha: Optional[str] = None

@api_router.get("/usuarios", response_model=List[User])
async def get_usuarios(
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("usuarios", "ler"))
):
    """Lista usuários com paginação opcional (apenas admin)"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        usuarios = await db.users.find({}, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        usuarios = await db.users.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return usuarios


@api_router.post("/usuarios")
async def create_usuario(user_data: dict, current_user: dict = Depends(require_permission("usuarios", "criar"))):
    """Cria novo usuário (apenas admin) com suporte RBAC"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    # Validar email único
    existing = await db.users.find_one({"email": user_data.get("email")}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Validar senha
    if not user_data.get("senha") or len(user_data["senha"]) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    
    # Validar role_id e sincronizar campo papel
    papel_default = "vendedor"
    if user_data.get("role_id"):
        role = await db.roles.find_one({"id": user_data["role_id"]}, {"_id": 0})
        if not role:
            raise HTTPException(status_code=400, detail="Papel não encontrado")
        # Sincronizar campo papel baseado no nome do role
        role_name = role.get("nome", "").lower()
        if "admin" in role_name:
            papel_default = "admin"
        elif "gerente" in role_name:
            papel_default = "gerente"
        elif "vendedor" in role_name:
            papel_default = "vendedor"
        else:
            papel_default = "visualizador"
    
    # Criar usuário
    user = User(
        email=user_data["email"],
        nome=user_data["nome"],
        senha_hash=hash_password(user_data["senha"]),
        papel=user_data.get("papel", papel_default),  # Sincroniza com role ou usa valor fornecido
        ativo=user_data.get("ativo", True)
    )
    
    user_dict = user.model_dump()
    
    # Adicionar campos RBAC
    user_dict["role_id"] = user_data.get("role_id")
    user_dict["grupos"] = user_data.get("grupos", [])
    user_dict["require_2fa"] = user_data.get("require_2fa", False)
    user_dict["senha_ultimo_change"] = datetime.now(timezone.utc).isoformat()
    user_dict["senha_historia"] = []
    user_dict["login_attempts"] = 0
    user_dict["locked_until"] = None
    
    await db.users.insert_one(user_dict)
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="usuarios",
        acao="criar",
        detalhes={"usuario_criado_id": user.id, "usuario_email": user.email}
    )
    
    return {"message": "Usuário criado com sucesso", "user_id": user.id}

@api_router.get("/usuarios/{user_id}", response_model=User)
async def get_usuario(user_id: str, current_user: dict = Depends(require_permission("usuarios", "ler"))):
    
    usuario = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@api_router.put("/usuarios/{user_id}")
async def update_usuario(user_id: str, user_data: dict, current_user: dict = Depends(require_permission("usuarios", "editar"))):
    
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se email já existe em outro usuário
    if user_data.get("email"):
        email_exists = await db.users.find_one({"email": user_data["email"], "id": {"$ne": user_id}}, {"_id": 0})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email já cadastrado para outro usuário")
    
    # Preparar dados de atualização
    update_fields = {}
    
    if user_data.get("nome"):
        update_fields["nome"] = user_data["nome"]
    if user_data.get("email"):
        update_fields["email"] = user_data["email"]
    if user_data.get("ativo") is not None:
        update_fields["ativo"] = user_data["ativo"]
    if user_data.get("role_id") is not None:
        # Validar role existe e sincronizar campo papel
        if user_data["role_id"]:
            role = await db.roles.find_one({"id": user_data["role_id"]}, {"_id": 0})
            if not role:
                raise HTTPException(status_code=400, detail="Papel não encontrado")
            # Sincronizar campo papel (compatibilidade) baseado no nome do role
            role_name = role.get("nome", "").lower()
            if "admin" in role_name:
                update_fields["papel"] = "admin"
            elif "gerente" in role_name:
                update_fields["papel"] = "gerente"
            elif "vendedor" in role_name:
                update_fields["papel"] = "vendedor"
            else:
                update_fields["papel"] = "visualizador"
        update_fields["role_id"] = user_data["role_id"]
    # Permitir atualização direta do campo papel (compatibilidade)
    if user_data.get("papel"):
        update_fields["papel"] = user_data["papel"]
    if user_data.get("require_2fa") is not None:
        update_fields["require_2fa"] = user_data["require_2fa"]
    
    # Atualizar senha se fornecida
    if user_data.get("senha"):
        if len(user_data["senha"]) < 6:
            raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
        update_fields["senha_hash"] = hash_password(user_data["senha"])
        update_fields["senha_ultimo_change"] = datetime.now(timezone.utc).isoformat()
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_fields})
    
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
async def delete_usuario(user_id: str, current_user: dict = Depends(require_permission("usuarios", "deletar"))):
    
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


# ========== RBAC ENDPOINTS ==========

# --- ROLES (Papéis) ---

@api_router.get("/roles", response_model=List[Role])
async def get_roles(
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("usuarios", "ler"))
):
    """Lista todos os papéis com paginação opcional"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem gerenciar papéis")
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        roles = await db.roles.find({}, {"_id": 0}).sort("hierarquia_nivel", 1).to_list(1000)
    else:
        skip = (page - 1) * limit
        roles = await db.roles.find({}, {"_id": 0}).sort("hierarquia_nivel", 1).skip(skip).limit(limit).to_list(limit)
    
    return roles

@api_router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str, current_user: dict = Depends(get_current_user)):
    """Busca um papel específico"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Papel não encontrado")
    return role

@api_router.post("/roles")
async def create_role(role_data: RoleCreate, current_user: dict = Depends(require_permission("usuarios", "criar"))):
    """Cria novo papel customizado"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    # Verificar se nome já existe
    existing = await db.roles.find_one({"nome": role_data.nome}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um papel com este nome")
    
    # Validar permissões existem
    for perm_id in role_data.permissoes:
        perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
        if not perm:
            raise HTTPException(status_code=400, detail=f"Permissão {perm_id} não encontrada")
    
    role = Role(
        nome=role_data.nome,
        descricao=role_data.descricao,
        cor=role_data.cor,
        hierarquia_nivel=role_data.hierarquia_nivel,
        permissoes=role_data.permissoes,
        is_sistema=False
    )
    
    await db.roles.insert_one(role.model_dump())
    
    # Log de auditoria
    await log_permission_change(
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        acao="role_created",
        detalhes={"role_id": role.id, "role_nome": role.nome},
        target_role_id=role.id
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="papeis",
        acao="criar",
        detalhes={"role_id": role.id, "role_nome": role.nome}
    )
    
    return {"message": "Papel criado com sucesso", "role_id": role.id}

@api_router.put("/roles/{role_id}")
async def update_role(role_id: str, role_data: RoleUpdate, current_user: dict = Depends(get_current_user)):
    """Atualiza papel existente"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Papel não encontrado")
    
    # Não permitir editar papéis do sistema
    if role.get("is_sistema", False):
        raise HTTPException(status_code=400, detail="Papéis do sistema não podem ser editados")
    
    # Validar permissões se fornecidas
    if role_data.permissoes is not None:
        for perm_id in role_data.permissoes:
            perm = await db.permissions.find_one({"id": perm_id}, {"_id": 0})
            if not perm:
                raise HTTPException(status_code=400, detail=f"Permissão {perm_id} não encontrada")
    
    update_data = {k: v for k, v in role_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    # Log de auditoria
    await log_permission_change(
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        acao="role_updated",
        detalhes={"role_id": role_id, "changes": update_data},
        target_role_id=role_id
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="papeis",
        acao="editar",
        detalhes={"role_id": role_id}
    )
    
    return {"message": "Papel atualizado com sucesso"}

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(get_current_user)):
    """Deleta papel customizado"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Papel não encontrado")
    
    # Não permitir deletar papéis do sistema
    if role.get("is_sistema", False):
        raise HTTPException(status_code=400, detail="Papéis do sistema não podem ser deletados")
    
    # Verificar se há usuários usando este papel
    users_with_role = await db.users.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Existem {users_with_role} usuário(s) com este papel. Reatribua antes de deletar."
        )
    
    await db.roles.delete_one({"id": role_id})
    
    # Log de auditoria
    await log_permission_change(
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        acao="role_deleted",
        detalhes={"role_id": role_id, "role_nome": role["nome"]},
        target_role_id=role_id
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="papeis",
        acao="deletar",
        detalhes={"role_id": role_id}
    )
    
    return {"message": "Papel deletado com sucesso"}

@api_router.post("/roles/{role_id}/duplicate")
async def duplicate_role(role_id: str, novo_nome: str, current_user: dict = Depends(get_current_user)):
    """Duplica um papel existente"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Papel não encontrado")
    
    # Verificar se novo nome já existe
    existing = await db.roles.find_one({"nome": novo_nome}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um papel com este nome")
    
    new_role = Role(
        nome=novo_nome,
        descricao=f"Cópia de {role['nome']}",
        cor=role["cor"],
        hierarquia_nivel=role["hierarquia_nivel"],
        permissoes=role["permissoes"],
        is_sistema=False
    )
    
    await db.roles.insert_one(new_role.model_dump())
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="papeis",
        acao="duplicar",
        detalhes={"role_original_id": role_id, "role_novo_id": new_role.id}
    )
    
    return {"message": "Papel duplicado com sucesso", "role_id": new_role.id}

# --- PERMISSIONS (Permissões) ---

@api_router.get("/permissions", response_model=List[Permission])
async def get_permissions(current_user: dict = Depends(require_permission("usuarios", "ler"))):
    """Lista todas as permissões do sistema"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    permissions = await db.permissions.find({}, {"_id": 0}).sort([("modulo", 1), ("acao", 1)]).to_list(10000)
    return permissions

@api_router.get("/permissions/by-module")
async def get_permissions_by_module(current_user: dict = Depends(get_current_user)):
    """Lista permissões agrupadas por módulo"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    permissions = await db.permissions.find({}, {"_id": 0}).to_list(10000)
    
    # Agrupar por módulo
    by_module = {}
    for perm in permissions:
        modulo = perm["modulo"]
        if modulo not in by_module:
            by_module[modulo] = []
        by_module[modulo].append(perm)
    
    return by_module

@api_router.get("/users/{user_id}/permissions")
async def get_user_all_permissions(user_id: str, current_user: dict = Depends(require_permission("usuarios", "ler"))):
    """Retorna todas as permissões efetivas de um usuário"""
    if current_user.get("papel") != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    permissions = await get_user_permissions(user_id)
    
    # Agrupar por módulo
    by_module = {}
    for perm in permissions:
        modulo = perm["modulo"]
        if modulo not in by_module:
            by_module[modulo] = []
        by_module[modulo].append(perm["acao"])
    
    return {
        "user_id": user_id,
        "total_permissions": len(permissions),
        "permissions": permissions,
        "by_module": by_module
    }

# --- USER GROUPS (Grupos) ---

@api_router.get("/user-groups", response_model=List[UserGroup])
async def get_user_groups(current_user: dict = Depends(require_permission("usuarios", "ler"))):
    """Lista todos os grupos"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    groups = await db.user_groups.find({}, {"_id": 0}).to_list(1000)
    return groups

@api_router.post("/user-groups")
async def create_user_group(group_data: UserGroupCreate, current_user: dict = Depends(require_permission("usuarios", "criar"))):
    """Cria novo grupo de usuários"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    # Verificar se nome já existe
    existing = await db.user_groups.find_one({"nome": group_data.nome}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um grupo com este nome")
    
    group = UserGroup(
        nome=group_data.nome,
        descricao=group_data.descricao,
        user_ids=group_data.user_ids,
        role_ids=group_data.role_ids
    )
    
    await db.user_groups.insert_one(group.model_dump())
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="grupos",
        acao="criar",
        detalhes={"group_id": group.id, "group_nome": group.nome}
    )
    
    return {"message": "Grupo criado com sucesso", "group_id": group.id}

@api_router.put("/user-groups/{group_id}")
async def update_user_group(group_id: str, group_data: UserGroupCreate, current_user: dict = Depends(get_current_user)):
    """Atualiza grupo existente"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    group = await db.user_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    
    await db.user_groups.update_one(
        {"id": group_id},
        {"$set": group_data.model_dump()}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="grupos",
        acao="editar",
        detalhes={"group_id": group_id}
    )
    
    return {"message": "Grupo atualizado com sucesso"}

@api_router.delete("/user-groups/{group_id}")
async def delete_user_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Deleta grupo"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    result = await db.user_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    
    # Remover grupo dos usuários
    await db.users.update_many(
        {"grupos": group_id},
        {"$pull": {"grupos": group_id}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="grupos",
        acao="deletar",
        detalhes={"group_id": group_id}
    )
    
    return {"message": "Grupo deletado com sucesso"}

# --- PERMISSION HISTORY (Histórico) ---

@api_router.get("/permission-history")
async def get_permission_history(
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(require_permission("logs", "ler"))
):
    """Lista histórico de mudanças de permissões"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    total = await db.permission_history.count_documents({})
    history = await db.permission_history.find({}, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "history": history
    }

# --- TEMPORARY PERMISSIONS (Permissões Temporárias) ---

@api_router.post("/temporary-permissions")
async def grant_temporary_permission(
    user_id: str,
    permission_ids: List[str],
    valid_from: str,
    valid_until: str,
    motivo: str,
    current_user: dict = Depends(require_permission("usuarios", "criar"))
):
    """Concede permissão temporária a usuário"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    temp_perm = TemporaryPermission(
        user_id=user_id,
        permission_ids=permission_ids,
        granted_by=current_user["id"],
        valid_from=valid_from,
        valid_until=valid_until,
        motivo=motivo
    )
    
    await db.temporary_permissions.insert_one(temp_perm.model_dump())
    
    await log_permission_change(
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        acao="temporary_permission_granted",
        detalhes={
            "temp_perm_id": temp_perm.id,
            "target_user_id": user_id,
            "valid_from": valid_from,
            "valid_until": valid_until
        },
        target_user_id=user_id
    )
    
    return {"message": "Permissão temporária concedida", "id": temp_perm.id}

@api_router.get("/users/{user_id}/temporary-permissions")
async def get_user_temporary_permissions(user_id: str, current_user: dict = Depends(require_permission("usuarios", "ler"))):
    """Lista permissões temporárias de um usuário"""
    if current_user.get("papel") != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    temp_perms = await db.temporary_permissions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return temp_perms

# --- INITIALIZATION ---

@api_router.post("/rbac/initialize")
async def initialize_rbac(current_user: dict = Depends(require_permission("usuarios", "criar"))):
    """Inicializa sistema RBAC com papéis e permissões padrão"""
    if current_user.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    await initialize_default_roles_and_permissions()
    
    return {"message": "Sistema RBAC inicializado com sucesso"}


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
async def get_clientes(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("clientes", "ler"))
):
    """Lista clientes com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        clientes = await db.clientes.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        clientes = await db.clientes.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return clientes

@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente_data: ClienteCreate, current_user: dict = Depends(require_permission("clientes", "criar"))):
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
async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(require_permission("clientes", "editar"))):
    existing = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    updated_data = cliente_data.model_dump()
    updated_data["id"] = cliente_id
    updated_data["created_at"] = existing["created_at"]
    updated_data["ativo"] = existing.get("ativo", True)  # Preservar status ativo
    
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
async def delete_cliente(cliente_id: str, current_user: dict = Depends(require_permission("clientes", "deletar"))):
    # Verificar se o cliente existe
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Verificar dependências - Orçamentos
    orcamentos_count = await db.orcamentos.count_documents({"cliente_id": cliente_id})
    if orcamentos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o cliente '{cliente['nome']}' pois existem {orcamentos_count} orçamento(s) vinculado(s). Exclua os orçamentos primeiro."
        )
    
    # Verificar dependências - Vendas
    vendas_count = await db.vendas.count_documents({"cliente_id": cliente_id})
    if vendas_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o cliente '{cliente['nome']}' pois existem {vendas_count} venda(s) vinculada(s). Exclua as vendas primeiro."
        )
    
    # Excluir cliente
    await db.clientes.delete_one({"id": cliente_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="clientes",
        acao="deletar",
        detalhes={"cliente_id": cliente_id, "nome": cliente["nome"]}
    )
    return {"message": "Cliente excluído com sucesso"}

@api_router.put("/clientes/{cliente_id}/toggle-status")
async def toggle_cliente_status(cliente_id: str, current_user: dict = Depends(require_permission("clientes", "editar"))):
    # Verificar se o cliente existe
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    novo_status = not cliente.get("ativo", True)
    
    # Se estiver inativando, verificar orçamentos e vendas em aberto
    if not novo_status:
        orcamentos_abertos = await db.orcamentos.count_documents({
            "cliente_id": cliente_id,
            "status": {"$in": ["aberto", "em_analise", "aprovado"]}
        })
        if orcamentos_abertos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar o cliente '{cliente['nome']}' pois existem {orcamentos_abertos} orçamento(s) em aberto. Finalize ou cancele os orçamentos primeiro."
            )
        
        # Verificar vendas pendentes
        vendas_pendentes = await db.vendas.count_documents({
            "cliente_id": cliente_id,
            "status_pagamento": {"$in": ["pendente", "parcial"]}
        })
        if vendas_pendentes > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar o cliente '{cliente['nome']}' pois existem {vendas_pendentes} venda(s) com pagamento pendente. Finalize os pagamentos primeiro."
            )
    
    # Atualizar status
    await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="clientes",
        acao="alterar_status",
        detalhes={"cliente_id": cliente_id, "nome": cliente["nome"], "novo_status": novo_status}
    )
    return {"message": f"Cliente {'ativado' if novo_status else 'inativado'} com sucesso", "ativo": novo_status}

# ========== FORNECEDORES ==========

@api_router.get("/fornecedores", response_model=List[Fornecedor])
async def get_fornecedores(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("fornecedores", "ler"))
):
    """Lista fornecedores com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        fornecedores = await db.fornecedores.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        fornecedores = await db.fornecedores.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return fornecedores

@api_router.post("/fornecedores", response_model=Fornecedor)
async def create_fornecedor(fornecedor_data: FornecedorCreate, current_user: dict = Depends(require_permission("fornecedores", "criar"))):
    fornecedor = Fornecedor(**fornecedor_data.model_dump())
    await db.fornecedores.insert_one(fornecedor.model_dump())
    return fornecedor

@api_router.put("/fornecedores/{fornecedor_id}", response_model=Fornecedor)
async def update_fornecedor(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(require_permission("fornecedores", "editar"))):
    # Verificar se o fornecedor existe
    existing = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Atualizar dados
    updated_data = fornecedor_data.model_dump()
    updated_data["id"] = fornecedor_id
    updated_data["created_at"] = existing["created_at"]
    updated_data["ativo"] = existing.get("ativo", True)  # Preservar status ativo
    
    await db.fornecedores.replace_one({"id": fornecedor_id}, updated_data)
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="fornecedores",
        acao="editar",
        detalhes={"fornecedor_id": fornecedor_id, "razao_social": fornecedor_data.razao_social}
    )
    return Fornecedor(**updated_data)

@api_router.delete("/fornecedores/{fornecedor_id}")
async def delete_fornecedor(fornecedor_id: str, current_user: dict = Depends(require_permission("fornecedores", "deletar"))):
    # Verificar se o fornecedor existe
    fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Verificar dependências - Notas Fiscais
    notas_count = await db.notas_fiscais.count_documents({"fornecedor_id": fornecedor_id})
    if notas_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o fornecedor '{fornecedor['razao_social']}' pois existem {notas_count} nota(s) fiscal(is) vinculada(s). Exclua as notas fiscais primeiro."
        )
    
    # Verificar dependências - Produtos
    produtos_count = await db.produtos.count_documents({"fornecedor_preferencial_id": fornecedor_id})
    if produtos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o fornecedor '{fornecedor['razao_social']}' pois existem {produtos_count} produto(s) vinculado(s) a ele. Exclua ou altere o fornecedor dos produtos primeiro."
        )
    
    # Excluir fornecedor
    await db.fornecedores.delete_one({"id": fornecedor_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="fornecedores",
        acao="deletar",
        detalhes={"fornecedor_id": fornecedor_id, "razao_social": fornecedor["razao_social"]}
    )
    return {"message": "Fornecedor excluído com sucesso"}

@api_router.put("/fornecedores/{fornecedor_id}/toggle-status")
async def toggle_fornecedor_status(fornecedor_id: str, current_user: dict = Depends(require_permission("fornecedores", "editar"))):
    # Verificar se o fornecedor existe
    fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    novo_status = not fornecedor.get("ativo", True)
    
    # Se estiver inativando, verificar dependências
    if not novo_status:
        # Verificar notas fiscais pendentes
        notas_pendentes = await db.notas_fiscais.count_documents({
            "fornecedor_id": fornecedor_id,
            "status": {"$in": ["rascunho", "aguardando_aprovacao", "aprovada"]}
        })
        if notas_pendentes > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar o fornecedor '{fornecedor['razao_social']}' pois existem {notas_pendentes} nota(s) fiscal(is) pendente(s). Confirme ou cancele as notas primeiro."
            )
        
        # Verificar produtos ativos que usam este fornecedor
        produtos_ativos = await db.produtos.count_documents({
            "fornecedor_preferencial_id": fornecedor_id,
            "ativo": True
        })
        if produtos_ativos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar o fornecedor '{fornecedor['razao_social']}' pois existem {produtos_ativos} produto(s) ativo(s) vinculado(s) a ele. Inative os produtos ou altere o fornecedor preferencial primeiro."
            )
    
    # Atualizar status
    await db.fornecedores.update_one(
        {"id": fornecedor_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="fornecedores",
        acao="alterar_status",
        detalhes={"fornecedor_id": fornecedor_id, "razao_social": fornecedor["razao_social"], "novo_status": novo_status}
    )
    return {"message": f"Fornecedor {'ativado' if novo_status else 'inativado'} com sucesso", "ativo": novo_status}


# ========== MARCAS ==========

@api_router.get("/marcas", response_model=List[Marca])
async def get_marcas(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("marcas", "ler"))
):
    """Lista marcas com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        marcas = await db.marcas.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        marcas = await db.marcas.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return marcas

@api_router.post("/marcas", response_model=Marca)
async def create_marca(marca_data: MarcaCreate, current_user: dict = Depends(require_permission("marcas", "criar"))):
    marca = Marca(**marca_data.model_dump())
    await db.marcas.insert_one(marca.model_dump())
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="marcas",
        acao="criar",
        detalhes={"nome": marca.nome, "marca_id": marca.id}
    )
    return marca

@api_router.put("/marcas/{marca_id}", response_model=Marca)
async def update_marca(marca_id: str, marca_data: MarcaCreate, current_user: dict = Depends(require_permission("marcas", "editar"))):
    # Verificar se a marca existe
    existing = await db.marcas.find_one({"id": marca_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Atualizar dados
    updated_data = marca_data.model_dump()
    updated_data["id"] = marca_id
    updated_data["created_at"] = existing["created_at"]
    
    await db.marcas.replace_one({"id": marca_id}, updated_data)
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="marcas",
        acao="editar",
        detalhes={"marca_id": marca_id, "nome": marca_data.nome}
    )
    return Marca(**updated_data)

@api_router.delete("/marcas/{marca_id}")
async def delete_marca(marca_id: str, current_user: dict = Depends(require_permission("marcas", "deletar"))):
    # Verificar se a marca existe
    marca = await db.marcas.find_one({"id": marca_id}, {"_id": 0})
    if not marca:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Verificar dependências - Categorias vinculadas
    categorias_count = await db.categorias.count_documents({"marca_id": marca_id})
    if categorias_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir a marca '{marca['nome']}' pois existem {categorias_count} categoria(s) vinculada(s). Exclua ou reatribua as categorias primeiro."
        )
    
    # Verificar dependências - Produtos vinculados
    produtos_count = await db.produtos.count_documents({"marca_id": marca_id})
    if produtos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir a marca '{marca['nome']}' pois existem {produtos_count} produto(s) vinculado(s) a ela. Exclua ou reatribua os produtos primeiro."
        )
    
    # Excluir marca
    await db.marcas.delete_one({"id": marca_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="marcas",
        acao="deletar",
        detalhes={"marca_id": marca_id, "nome": marca["nome"]}
    )
    return {"message": "Marca excluída com sucesso"}

@api_router.put("/marcas/{marca_id}/toggle-status")
async def toggle_marca_status(marca_id: str, current_user: dict = Depends(require_permission("marcas", "editar"))):
    # Verificar se a marca existe
    marca = await db.marcas.find_one({"id": marca_id}, {"_id": 0})
    if not marca:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    novo_status = not marca.get("ativo", True)
    
    # Se estiver inativando, verificar dependências ativas
    if not novo_status:
        # Verificar categorias ativas vinculadas
        categorias_ativas = await db.categorias.count_documents({
            "marca_id": marca_id,
            "ativo": True
        })
        if categorias_ativas > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar a marca '{marca['nome']}' pois existem {categorias_ativas} categoria(s) ativa(s) vinculada(s). Inative as categorias primeiro."
            )
        
        # Verificar produtos ativos vinculados
        produtos_ativos = await db.produtos.count_documents({
            "marca_id": marca_id,
            "ativo": True
        })
        if produtos_ativos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar a marca '{marca['nome']}' pois existem {produtos_ativos} produto(s) ativo(s) vinculado(s) a ela. Inative os produtos primeiro."
            )
    
    # Atualizar status
    await db.marcas.update_one(
        {"id": marca_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="marcas",
        acao="alterar_status",
        detalhes={"marca_id": marca_id, "nome": marca["nome"], "novo_status": novo_status}
    )
    return {"message": f"Marca {'ativada' if novo_status else 'inativada'} com sucesso", "ativo": novo_status}


# ========== CATEGORIAS ==========

@api_router.get("/categorias", response_model=List[Categoria])
async def get_categorias(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("categorias", "ler"))
):
    """Lista categorias com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        categorias = await db.categorias.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        categorias = await db.categorias.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return categorias

@api_router.post("/categorias", response_model=Categoria)
async def create_categoria(categoria_data: CategoriaCreate, current_user: dict = Depends(require_permission("categorias", "criar"))):
    # Validar que a marca existe
    marca = await db.marcas.find_one({"id": categoria_data.marca_id}, {"_id": 0})
    if not marca:
        raise HTTPException(
            status_code=400, 
            detail=f"Marca com ID {categoria_data.marca_id} não encontrada. Por favor, cadastre a marca primeiro."
        )
    
    if not marca.get("ativo", False):
        raise HTTPException(
            status_code=400,
            detail="A marca selecionada está inativa. Por favor, selecione uma marca ativa."
        )
    
    categoria = Categoria(**categoria_data.model_dump())
    await db.categorias.insert_one(categoria.model_dump())
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="categorias",
        acao="criar",
        detalhes={"nome": categoria.nome, "marca_id": categoria.marca_id, "categoria_id": categoria.id}
    )
    return categoria

@api_router.put("/categorias/{categoria_id}", response_model=Categoria)
async def update_categoria(categoria_id: str, categoria_data: CategoriaCreate, current_user: dict = Depends(require_permission("categorias", "editar"))):
    # Verificar se a categoria existe
    existing = await db.categorias.find_one({"id": categoria_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Validar que a marca existe e está ativa
    marca = await db.marcas.find_one({"id": categoria_data.marca_id}, {"_id": 0})
    if not marca:
        raise HTTPException(
            status_code=400,
            detail=f"Marca com ID {categoria_data.marca_id} não encontrada."
        )
    if not marca.get("ativo", False):
        raise HTTPException(
            status_code=400,
            detail="A marca selecionada está inativa. Por favor, selecione uma marca ativa."
        )
    
    # Atualizar dados
    updated_data = categoria_data.model_dump()
    updated_data["id"] = categoria_id
    updated_data["created_at"] = existing["created_at"]
    
    await db.categorias.replace_one({"id": categoria_id}, updated_data)
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="categorias",
        acao="editar",
        detalhes={"categoria_id": categoria_id, "nome": categoria_data.nome, "marca_id": categoria_data.marca_id}
    )
    return Categoria(**updated_data)

@api_router.delete("/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, current_user: dict = Depends(require_permission("categorias", "deletar"))):
    # Verificar se a categoria existe
    categoria = await db.categorias.find_one({"id": categoria_id}, {"_id": 0})
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar dependências - Subcategorias vinculadas
    subcategorias_count = await db.subcategorias.count_documents({"categoria_id": categoria_id})
    if subcategorias_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir a categoria '{categoria['nome']}' pois existem {subcategorias_count} subcategoria(s) vinculada(s). Exclua ou reatribua as subcategorias primeiro."
        )
    
    # Verificar dependências - Produtos vinculados
    produtos_count = await db.produtos.count_documents({"categoria_id": categoria_id})
    if produtos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir a categoria '{categoria['nome']}' pois existem {produtos_count} produto(s) vinculado(s). Exclua ou reatribua os produtos primeiro."
        )
    
    # Excluir categoria
    await db.categorias.delete_one({"id": categoria_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="categorias",
        acao="deletar",
        detalhes={"categoria_id": categoria_id, "nome": categoria["nome"]}
    )
    return {"message": "Categoria excluída com sucesso"}

@api_router.put("/categorias/{categoria_id}/toggle-status")
async def toggle_categoria_status(categoria_id: str, current_user: dict = Depends(require_permission("categorias", "editar"))):
    # Verificar se a categoria existe
    categoria = await db.categorias.find_one({"id": categoria_id}, {"_id": 0})
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    novo_status = not categoria.get("ativo", True)
    
    # Se estiver inativando, verificar dependências ativas
    if not novo_status:
        subcategorias_ativas = await db.subcategorias.count_documents({
            "categoria_id": categoria_id,
            "ativo": True
        })
        if subcategorias_ativas > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar a categoria '{categoria['nome']}' pois existem {subcategorias_ativas} subcategoria(s) ativa(s) vinculada(s). Inative as subcategorias primeiro."
            )
        
        produtos_ativos = await db.produtos.count_documents({
            "categoria_id": categoria_id,
            "ativo": True
        })
        if produtos_ativos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar a categoria '{categoria['nome']}' pois existem {produtos_ativos} produto(s) ativo(s) vinculado(s). Inative os produtos primeiro."
            )
    
    # Atualizar status
    await db.categorias.update_one(
        {"id": categoria_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="categorias",
        acao="alterar_status",
        detalhes={"categoria_id": categoria_id, "nome": categoria["nome"], "novo_status": novo_status}
    )
    return {"message": f"Categoria {'ativada' if novo_status else 'inativada'} com sucesso", "ativo": novo_status}


# ========== SUBCATEGORIAS ==========

@api_router.get("/subcategorias", response_model=List[Subcategoria])
async def get_subcategorias(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("subcategorias", "ler"))
):
    """Lista subcategorias com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        subcategorias = await db.subcategorias.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        subcategorias = await db.subcategorias.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return subcategorias

@api_router.post("/subcategorias", response_model=Subcategoria)
async def create_subcategoria(subcategoria_data: SubcategoriaCreate, current_user: dict = Depends(require_permission("subcategorias", "criar"))):
    # Validar que a categoria existe
    categoria = await db.categorias.find_one({"id": subcategoria_data.categoria_id}, {"_id": 0})
    if not categoria:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria com ID {subcategoria_data.categoria_id} não encontrada. Por favor, cadastre a categoria primeiro."
        )
    
    if not categoria.get("ativo", False):
        raise HTTPException(
            status_code=400,
            detail="A categoria selecionada está inativa. Por favor, selecione uma categoria ativa."
        )
    
    subcategoria = Subcategoria(**subcategoria_data.model_dump())
    await db.subcategorias.insert_one(subcategoria.model_dump())
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="subcategorias",
        acao="criar",
        detalhes={"nome": subcategoria.nome, "categoria_id": subcategoria.categoria_id, "subcategoria_id": subcategoria.id}
    )
    return subcategoria

@api_router.put("/subcategorias/{subcategoria_id}", response_model=Subcategoria)
async def update_subcategoria(subcategoria_id: str, subcategoria_data: SubcategoriaCreate, current_user: dict = Depends(require_permission("subcategorias", "editar"))):
    # Verificar se a subcategoria existe
    existing = await db.subcategorias.find_one({"id": subcategoria_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Subcategoria não encontrada")
    
    # Validar que a categoria existe e está ativa
    categoria = await db.categorias.find_one({"id": subcategoria_data.categoria_id}, {"_id": 0})
    if not categoria:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria com ID {subcategoria_data.categoria_id} não encontrada."
        )
    if not categoria.get("ativo", False):
        raise HTTPException(
            status_code=400,
            detail="A categoria selecionada está inativa. Por favor, selecione uma categoria ativa."
        )
    
    # Atualizar dados
    updated_data = subcategoria_data.model_dump()
    updated_data["id"] = subcategoria_id
    updated_data["created_at"] = existing["created_at"]
    
    await db.subcategorias.replace_one({"id": subcategoria_id}, updated_data)
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="subcategorias",
        acao="editar",
        detalhes={"subcategoria_id": subcategoria_id, "nome": subcategoria_data.nome, "categoria_id": subcategoria_data.categoria_id}
    )
    return Subcategoria(**updated_data)

@api_router.delete("/subcategorias/{subcategoria_id}")
async def delete_subcategoria(subcategoria_id: str, current_user: dict = Depends(require_permission("subcategorias", "deletar"))):
    # Verificar se a subcategoria existe
    subcategoria = await db.subcategorias.find_one({"id": subcategoria_id}, {"_id": 0})
    if not subcategoria:
        raise HTTPException(status_code=404, detail="Subcategoria não encontrada")
    
    # Verificar dependências - Produtos vinculados
    produtos_count = await db.produtos.count_documents({"subcategoria_id": subcategoria_id})
    if produtos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir a subcategoria '{subcategoria['nome']}' pois existem {produtos_count} produto(s) vinculado(s). Exclua ou reatribua os produtos primeiro."
        )
    
    # Excluir subcategoria
    await db.subcategorias.delete_one({"id": subcategoria_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="subcategorias",
        acao="deletar",
        detalhes={"subcategoria_id": subcategoria_id, "nome": subcategoria["nome"]}
    )
    return {"message": "Subcategoria excluída com sucesso"}

@api_router.put("/subcategorias/{subcategoria_id}/toggle-status")
async def toggle_subcategoria_status(subcategoria_id: str, current_user: dict = Depends(require_permission("subcategorias", "editar"))):
    # Verificar se a subcategoria existe
    subcategoria = await db.subcategorias.find_one({"id": subcategoria_id}, {"_id": 0})
    if not subcategoria:
        raise HTTPException(status_code=404, detail="Subcategoria não encontrada")
    
    novo_status = not subcategoria.get("ativo", True)
    
    # Se estiver inativando, verificar produtos ativos
    if not novo_status:
        produtos_ativos = await db.produtos.count_documents({
            "subcategoria_id": subcategoria_id,
            "ativo": True
        })
        if produtos_ativos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar a subcategoria '{subcategoria['nome']}' pois existem {produtos_ativos} produto(s) ativo(s) vinculado(s). Inative os produtos primeiro."
            )
    
    # Atualizar status
    await db.subcategorias.update_one(
        {"id": subcategoria_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="subcategorias",
        acao="alterar_status",
        detalhes={"subcategoria_id": subcategoria_id, "nome": subcategoria["nome"], "novo_status": novo_status}
    )
    return {"message": f"Subcategoria {'ativada' if novo_status else 'inativada'} com sucesso", "ativo": novo_status}


# ========== PRODUTOS ==========

async def recalcular_precos_produto(produto_id: str):
    """
    Recalcula preço_medio e preco_ultima_compra de um produto com base nas notas fiscais confirmadas
    - Preço Médio: média ponderada de todas as compras (soma(preco*qtd) / soma(qtd))
    - Preço Última Compra: preço da nota fiscal mais recente
    """
    # Buscar o produto
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        return
    
    # Buscar todas as notas fiscais confirmadas que contêm este produto
    notas = await db.notas_fiscais.find(
        {
            "confirmado": True,
            "cancelada": False,
            "status": {"$ne": "cancelada"},
            "itens.produto_id": produto_id
        },
        {"_id": 0}
    ).sort("data_emissao", -1).to_list(10000)
    
    if not notas:
        # Se não há notas fiscais, preco_medio = preco_inicial e preco_ultima_compra = None
        await db.produtos.update_one(
            {"id": produto_id},
            {"$set": {
                "preco_medio": produto.get("preco_inicial", 0),
                "preco_ultima_compra": None
            }}
        )
        return
    
    # Calcular preço médio ponderado e preço da última compra
    soma_valores = 0
    soma_quantidades = 0
    preco_ultima_compra = None
    
    for nota in notas:
        for item in nota.get("itens", []):
            if item.get("produto_id") == produto_id:
                quantidade = item.get("quantidade", 0)
                preco_unitario = item.get("preco_unitario", 0)
                
                soma_valores += quantidade * preco_unitario
                soma_quantidades += quantidade
                
                # Primeira iteração (nota mais recente)
                if preco_ultima_compra is None:
                    preco_ultima_compra = preco_unitario
    
    # Calcular preço médio
    preco_medio = soma_valores / soma_quantidades if soma_quantidades > 0 else produto.get("preco_inicial", 0)
    
    # Se não há última compra, usar preço inicial
    if preco_ultima_compra is None:
        preco_ultima_compra = produto.get("preco_inicial", 0)
    
    # Atualizar produto
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {
            "preco_medio": round(preco_medio, 2),
            "preco_ultima_compra": round(preco_ultima_compra, 2)
        }}
    )
    
    return {
        "preco_medio": round(preco_medio, 2),
        "preco_ultima_compra": round(preco_ultima_compra, 2)
    }



@api_router.get("/produtos", response_model=List[Produto])
async def get_produtos(
    incluir_inativos: bool = False,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("produtos", "ler"))
):
    """Lista produtos com paginação opcional"""
    filtro = {} if incluir_inativos else {"ativo": True}
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        produtos = await db.produtos.find(filtro, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        produtos = await db.produtos.find(filtro, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return produtos

@api_router.post("/produtos", response_model=Produto)
async def create_produto(produto_data: ProdutoCreate, current_user: dict = Depends(require_permission("produtos", "criar"))):
    # Inicializar preço_medio com preço_inicial no momento do cadastro
    produto_dict = produto_data.model_dump()
    produto_dict["preco_medio"] = produto_dict["preco_inicial"]
    produto_dict["preco_ultima_compra"] = None
    
    # Calcular margem automaticamente usando preco_medio
    if produto_dict.get("margem_lucro") is None and produto_dict["preco_medio"] > 0:
        produto_dict["margem_lucro"] = ((produto_dict["preco_venda"] - produto_dict["preco_medio"]) / produto_dict["preco_medio"]) * 100
    
    produto = Produto(**produto_dict)
    await db.produtos.insert_one(produto.model_dump())
    
    # Registrar histórico de preço inicial
    historico = HistoricoPreco(
        produto_id=produto.id,
        preco_custo_anterior=0,
        preco_custo_novo=produto.preco_inicial,
        preco_venda_anterior=0,
        preco_venda_novo=produto.preco_venda,
        margem_anterior=0,
        margem_nova=produto.margem_lucro or 0,
        usuario_id=current_user["id"],
        usuario_nome=current_user["nome"],
        motivo="Criação do produto"
    )
    await db.historico_precos.insert_one(historico.model_dump())
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="criar",
        detalhes={"produto_id": produto.id, "nome": produto.nome, "sku": produto.sku}
    )
    return produto

@api_router.put("/produtos/{produto_id}", response_model=Produto)
async def update_produto(produto_id: str, produto_data: ProdutoCreate, current_user: dict = Depends(require_permission("produtos", "editar"))):
    existing = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Calcular margem automaticamente se não fornecida
    if produto_data.margem_lucro is None and produto_data.preco_custo > 0:
        produto_data.margem_lucro = ((produto_data.preco_venda - produto_data.preco_custo) / produto_data.preco_custo) * 100
    
    updated_data = produto_data.model_dump()
    updated_data["id"] = produto_id
    updated_data["estoque_atual"] = existing.get("estoque_atual", 0)
    updated_data["created_at"] = existing["created_at"]
    
    # Verificar se houve alteração de preços
    preco_custo_alterado = existing.get("preco_custo") != updated_data["preco_custo"]
    preco_venda_alterado = existing.get("preco_venda") != updated_data["preco_venda"]
    
    if preco_custo_alterado or preco_venda_alterado:
        # Registrar no histórico
        margem_anterior = existing.get("margem_lucro", 0)
        historico = HistoricoPreco(
            produto_id=produto_id,
            preco_custo_anterior=existing.get("preco_custo", 0),
            preco_custo_novo=updated_data["preco_custo"],
            preco_venda_anterior=existing.get("preco_venda", 0),
            preco_venda_novo=updated_data["preco_venda"],
            margem_anterior=margem_anterior,
            margem_nova=updated_data.get("margem_lucro", 0),
            usuario_id=current_user["id"],
            usuario_nome=current_user["nome"],
            motivo="Atualização de preços"
        )
        await db.historico_precos.insert_one(historico.model_dump())
    
    await db.produtos.replace_one({"id": produto_id}, updated_data)
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="editar",
        detalhes={"produto_id": produto_id, "nome": updated_data["nome"]}
    )
    return Produto(**updated_data)

@api_router.delete("/produtos/{produto_id}")
async def delete_produto(produto_id: str, current_user: dict = Depends(require_permission("produtos", "deletar"))):
    # Verificar se o produto existe
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Verificar dependências - Orçamentos
    orcamentos_count = await db.orcamentos.count_documents({"itens.produto_id": produto_id})
    if orcamentos_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o produto '{produto['nome']}' pois está vinculado a {orcamentos_count} orçamento(s). Remova o produto dos orçamentos primeiro."
        )
    
    # Verificar dependências - Vendas
    vendas_count = await db.vendas.count_documents({"itens.produto_id": produto_id})
    if vendas_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o produto '{produto['nome']}' pois está vinculado a {vendas_count} venda(s)."
        )
    
    # Verificar dependências - Movimentações de estoque
    movimentacoes_count = await db.movimentacoes_estoque.count_documents({"produto_id": produto_id})
    if movimentacoes_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o produto '{produto['nome']}' pois possui {movimentacoes_count} movimentação(ões) de estoque registrada(s)."
        )
    
    # Excluir produto
    await db.produtos.delete_one({"id": produto_id})
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="deletar",
        detalhes={"produto_id": produto_id, "nome": produto["nome"]}
    )
    return {"message": "Produto excluído com sucesso"}

@api_router.post("/produtos/{produto_id}/upload-imagem")
async def upload_imagem_produto(
    produto_id: str,
    imagem: dict,
    current_user: dict = Depends(require_permission("produtos", "editar"))
):
    """Upload de imagem para produto (base64)"""
    # Verificar se o produto existe
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Validar imagem base64
    imagem_base64 = imagem.get("imagem")
    if not imagem_base64:
        raise HTTPException(status_code=400, detail="Imagem não fornecida")
    
    # Verificar se já tem fotos, se não, criar lista
    fotos_atuais = produto.get("fotos", [])
    if fotos_atuais is None:
        fotos_atuais = []
    
    # Adicionar nova foto
    fotos_atuais.append(imagem_base64)
    
    # Atualizar produto
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {"fotos": fotos_atuais}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="upload_imagem",
        detalhes={"produto_id": produto_id, "total_fotos": len(fotos_atuais)}
    )
    
    return {"message": "Imagem enviada com sucesso", "total_fotos": len(fotos_atuais)}

@api_router.delete("/produtos/{produto_id}/imagem/{indice}")
async def deletar_imagem_produto(
    produto_id: str,
    indice: int,
    current_user: dict = Depends(require_permission("produtos", "editar"))
):
    """Remove uma imagem específica do produto"""
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    fotos = produto.get("fotos", [])
    if not fotos or indice >= len(fotos) or indice < 0:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    
    # Remover imagem
    fotos.pop(indice)
    
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {"fotos": fotos}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="deletar_imagem",
        detalhes={"produto_id": produto_id, "indice": indice}
    )
    
    return {"message": "Imagem removida com sucesso"}

@api_router.put("/produtos/{produto_id}/reordenar-imagens")
async def reordenar_imagens_produto(
    produto_id: str,
    nova_ordem: dict,
    current_user: dict = Depends(require_permission("produtos", "editar"))
):
    """Reordena as imagens do produto"""
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    fotos_atuais = produto.get("fotos", [])
    indices = nova_ordem.get("indices", [])
    
    # Validar índices
    if len(indices) != len(fotos_atuais):
        raise HTTPException(status_code=400, detail="Número de índices não corresponde ao número de fotos")
    
    # Reordenar fotos
    fotos_reordenadas = [fotos_atuais[i] for i in indices]
    
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {"fotos": fotos_reordenadas}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="reordenar_imagens",
        detalhes={"produto_id": produto_id}
    )
    
    return {"message": "Imagens reordenadas com sucesso"}

@api_router.put("/produtos/{produto_id}/imagem-principal/{indice}")
async def definir_imagem_principal(
    produto_id: str,
    indice: int,
    current_user: dict = Depends(require_permission("produtos", "editar"))
):
    """Define qual imagem é a principal do produto"""
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    fotos = produto.get("fotos", [])
    if not fotos or indice >= len(fotos) or indice < 0:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {"foto_principal_index": indice}}
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="definir_imagem_principal",
        detalhes={"produto_id": produto_id, "indice": indice}
    )
    
    return {"message": "Imagem principal definida com sucesso"}

@api_router.put("/produtos/{produto_id}/toggle-status")
async def toggle_produto_status(produto_id: str, current_user: dict = Depends(require_permission("produtos", "editar"))):
    # Verificar se o produto existe
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    novo_status = not produto.get("ativo", True)
    
    # Se estiver inativando, verificar orçamentos e vendas em aberto
    if not novo_status:
        # Verificar orçamentos abertos
        orcamentos_abertos = await db.orcamentos.count_documents({
            "itens.produto_id": produto_id,
            "status": {"$in": ["aberto", "em_analise", "aprovado"]}
        })
        if orcamentos_abertos > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível inativar o produto '{produto['nome']}' pois está em {orcamentos_abertos} orçamento(s) aberto(s). Finalize ou remova o produto dos orçamentos primeiro."
            )
    
    # Atualizar status
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": {"ativo": novo_status}}
    )
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="produtos",
        acao="alterar_status",
        detalhes={"produto_id": produto_id, "nome": produto["nome"], "novo_status": novo_status}
    )
    return {"message": f"Produto {'ativado' if novo_status else 'inativado'} com sucesso", "ativo": novo_status}

@api_router.get("/produtos/{produto_id}/historico-precos")
async def get_historico_precos_produto(produto_id: str, current_user: dict = Depends(require_permission("produtos", "ler"))):
    """Retorna o histórico de alterações de preços de um produto"""
    historico = await db.historico_precos.find(
        {"produto_id": produto_id},
        {"_id": 0}
    ).sort("data_alteracao", -1).to_list(100)
    return historico


@api_router.get("/produtos/{produto_id}/historico-compras")
async def get_historico_compras_produto(produto_id: str, current_user: dict = Depends(require_permission("produtos", "ler"))):
    """Retorna o histórico das últimas 5 compras do produto através de notas fiscais confirmadas"""
    # Buscar produto para validação
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Buscar notas fiscais confirmadas que contêm este produto
    notas = await db.notas_fiscais.find(
        {
            "confirmado": True,
            "cancelada": False,
            "status": {"$ne": "cancelada"},
            "itens.produto_id": produto_id
        },
        {"_id": 0}
    ).sort("data_emissao", -1).to_list(1000)
    
    # Extrair informações de compra do produto
    historico = []
    for nota in notas:
        # Encontrar o item específico do produto na nota
        for item in nota.get("itens", []):
            if item.get("produto_id") == produto_id:
                # Buscar informações do fornecedor
                fornecedor = await db.fornecedores.find_one(
                    {"id": nota.get("fornecedor_id")},
                    {"_id": 0, "razao_social": 1, "nome_fantasia": 1}
                )
                
                historico.append({
                    "data_emissao": nota.get("data_emissao"),
                    "numero_nf": nota.get("numero"),
                    "serie": nota.get("serie"),
                    "fornecedor_nome": fornecedor.get("razao_social") if fornecedor else "Fornecedor não encontrado",
                    "quantidade": item.get("quantidade"),
                    "preco_unitario": item.get("preco_unitario"),
                    "subtotal": item.get("quantidade", 0) * item.get("preco_unitario", 0)
                })
    
    # Retornar apenas as últimas 5 compras
    return historico[:5]


@api_router.get("/produtos/{produto_id}/historico-compras-completo")
async def get_historico_compras_completo_produto(
    produto_id: str, 
    page: int = 1, 
    limit: int = 20,
    current_user: dict = Depends(require_permission("produtos", "ler"))
):
    """Retorna o histórico completo de compras do produto com paginação"""
    # Buscar produto para validação
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Buscar todas as notas fiscais confirmadas que contêm este produto
    notas = await db.notas_fiscais.find(
        {
            "confirmado": True,
            "cancelada": False,
            "status": {"$ne": "cancelada"},
            "itens.produto_id": produto_id
        },
        {"_id": 0}
    ).sort("data_emissao", -1).to_list(10000)
    
    # Extrair informações de compra do produto
    historico = []
    for nota in notas:
        # Encontrar o item específico do produto na nota
        for item in nota.get("itens", []):
            if item.get("produto_id") == produto_id:
                # Buscar informações do fornecedor
                fornecedor = await db.fornecedores.find_one(
                    {"id": nota.get("fornecedor_id")},
                    {"_id": 0, "razao_social": 1, "nome_fantasia": 1, "cnpj": 1}
                )
                
                historico.append({
                    "data_emissao": nota.get("data_emissao"),
                    "numero_nf": nota.get("numero"),
                    "serie": nota.get("serie"),
                    "fornecedor_nome": fornecedor.get("razao_social") if fornecedor else "Fornecedor não encontrado",
                    "fornecedor_cnpj": fornecedor.get("cnpj") if fornecedor else "",
                    "quantidade": item.get("quantidade"),
                    "preco_unitario": item.get("preco_unitario"),
                    "subtotal": item.get("quantidade", 0) * item.get("preco_unitario", 0),
                    "nota_id": nota.get("id")
                })
    
    # Aplicar paginação
    total_items = len(historico)
    start_index = (page - 1) * limit
    end_index = start_index + limit
    paginated_history = historico[start_index:end_index]
    
    return {
        "data": paginated_history,
        "total": total_items,
        "page": page,
        "limit": limit,
        "total_pages": (total_items + limit - 1) // limit if total_items > 0 else 0
    }



@api_router.get("/produtos/relatorios/mais-vendidos")
async def get_produtos_mais_vendidos(
    limite: int = 10,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(require_permission("relatorios", "ler"))
):
    """Retorna os produtos mais vendidos"""
    # Agregar vendas por produto
    pipeline = [
        {"$unwind": "$itens"},
        {"$group": {
            "_id": "$itens.produto_id",
            "total_vendido": {"$sum": "$itens.quantidade"},
            "valor_total": {"$sum": {"$multiply": ["$itens.quantidade", "$itens.preco_unitario"]}}
        }},
        {"$sort": {"total_vendido": -1}},
        {"$limit": limite}
    ]
    
    resultados = await db.vendas.aggregate(pipeline).to_list(limite)
    
    # Buscar informações dos produtos
    produtos_ids = [r["_id"] for r in resultados]
    produtos = await db.produtos.find({"id": {"$in": produtos_ids}}, {"_id": 0}).to_list(len(produtos_ids))
    produtos_dict = {p["id"]: p for p in produtos}
    
    # Combinar resultados
    for resultado in resultados:
        produto_info = produtos_dict.get(resultado["_id"], {})
        resultado["produto_nome"] = produto_info.get("nome", "Desconhecido")
        resultado["produto_sku"] = produto_info.get("sku", "N/A")
    
    return resultados

@api_router.get("/produtos/relatorios/valor-estoque")
async def get_valor_total_estoque(current_user: dict = Depends(require_permission("relatorios", "ler"))):
    """Calcula o valor total do estoque"""
    produtos_ativos = await db.produtos.find({"ativo": True}, {"_id": 0}).to_list(1000)
    
    # Contar produtos ativos e inativos
    total_produtos_ativos = len(produtos_ativos)
    total_produtos_inativos = await db.produtos.count_documents({"ativo": False})
    total_produtos = total_produtos_ativos + total_produtos_inativos
    
    valor_custo_total = sum(p.get("estoque_atual", 0) * p.get("preco_custo", 0) for p in produtos_ativos)
    valor_venda_total = sum(p.get("estoque_atual", 0) * p.get("preco_venda", 0) for p in produtos_ativos)
    total_itens = sum(p.get("estoque_atual", 0) for p in produtos_ativos)
    
    # Produtos com estoque baixo (apenas ativos)
    produtos_estoque_baixo = [p for p in produtos_ativos if p.get("estoque_atual", 0) <= p.get("estoque_minimo", 0)]
    
    return {
        "valor_custo_total": round(valor_custo_total, 2),
        "valor_venda_total": round(valor_venda_total, 2),
        "margem_potencial": round(valor_venda_total - valor_custo_total, 2),
        "total_produtos": total_produtos,
        "total_produtos_ativos": total_produtos_ativos,
        "total_produtos_inativos": total_produtos_inativos,
        "total_itens_estoque": total_itens,
        "produtos_estoque_baixo": len(produtos_estoque_baixo),
        "produtos_estoque_baixo_lista": [{"id": p["id"], "nome": p["nome"], "estoque_atual": p.get("estoque_atual", 0)} for p in produtos_estoque_baixo[:10]]
    }

@api_router.get("/produtos/busca-avancada")
async def busca_avancada_produtos(
    termo: Optional[str] = None,
    marca_id: Optional[str] = None,
    categoria_id: Optional[str] = None,
    subcategoria_id: Optional[str] = None,
    ativo: Optional[bool] = None,
    com_estoque: Optional[bool] = None,
    estoque_baixo: Optional[bool] = None,
    em_destaque: Optional[bool] = None,
    current_user: dict = Depends(require_permission("produtos", "ler"))
):
    """Busca avançada de produtos com múltiplos filtros"""
    filtros = {}
    
    if termo:
        filtros["$or"] = [
            {"nome": {"$regex": termo, "$options": "i"}},
            {"sku": {"$regex": termo, "$options": "i"}},
            {"codigo_barras": {"$regex": termo, "$options": "i"}}
        ]
    
    if marca_id:
        filtros["marca_id"] = marca_id
    
    if categoria_id:
        filtros["categoria_id"] = categoria_id
    
    if subcategoria_id:
        filtros["subcategoria_id"] = subcategoria_id
    
    if ativo is not None:
        filtros["ativo"] = ativo
    
    if em_destaque is not None:
        filtros["em_destaque"] = em_destaque
    
    produtos = await db.produtos.find(filtros, {"_id": 0}).to_list(1000)
    
    # Filtros pós-busca
    if com_estoque is not None:
        if com_estoque:
            produtos = [p for p in produtos if p.get("estoque_atual", 0) > 0]
        else:
            produtos = [p for p in produtos if p.get("estoque_atual", 0) == 0]
    
    if estoque_baixo:
        produtos = [p for p in produtos if p.get("estoque_atual", 0) <= p.get("estoque_minimo", 0)]
    
    return produtos

# ========== ESTOQUE ==========

@api_router.get("/estoque/alertas")
async def get_alertas_estoque(
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Lista alertas de estoque com paginação opcional"""
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        produtos = await db.produtos.find({}, {"_id": 0}).to_list(10000)
    else:
        skip = (page - 1) * limit
        produtos = await db.produtos.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    alertas_minimo = [p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]]
    alertas_maximo = [p for p in produtos if p["estoque_atual"] >= p["estoque_maximo"]]
    
    return {
        "alertas_minimo": alertas_minimo,
        "alertas_maximo": alertas_maximo
    }

@api_router.get("/estoque/movimentacoes")
async def get_movimentacoes(
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Lista movimentações de estoque com paginação opcional"""
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        movimentacoes = await db.movimentacoes_estoque.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    else:
        skip = (page - 1) * limit
        movimentacoes = await db.movimentacoes_estoque.find({}, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enriquecer movimentações com nome do usuário
    for mov in movimentacoes:
        if mov.get("user_id"):
            usuario = await db.users.find_one({"id": mov["user_id"]}, {"_id": 0, "nome": 1})
            if usuario:
                mov["user_nome"] = usuario.get("nome", "Usuário não encontrado")
            else:
                mov["user_nome"] = "Usuário não encontrado"
        else:
            mov["user_nome"] = "Sistema"
    
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
async def ajuste_manual_estoque(request: AjusteEstoqueRequest, current_user: dict = Depends(require_permission("estoque", "editar"))):
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
    movimentacao_dict = {
        "id": str(uuid.uuid4()),
        "produto_id": request.produto_id,
        "tipo": tipo_movimentacao,
        "quantidade": abs(request.quantidade),
        "referencia_tipo": "ajuste_manual",
        "referencia_id": f"ajuste_{datetime.now(timezone.utc).timestamp()}",
        "user_id": current_user["id"],
        "motivo": request.motivo,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    print(f"DEBUG AJUSTE: Salvando movimentação com motivo: {request.motivo}")
    print(f"DEBUG AJUSTE: Dados completos: {movimentacao_dict}")
    
    await db.movimentacoes_estoque.insert_one(movimentacao_dict)
    
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

# ========== INVENTÁRIO PERIÓDICO ==========

@api_router.post("/estoque/inventario/iniciar", response_model=Inventario)
async def iniciar_inventario(
    observacoes: Optional[str] = None,
    current_user: dict = Depends(require_permission("estoque", "editar"))
):
    """Inicia um novo inventário periódico"""
    
    # Verificar se já existe inventário em andamento
    inventario_aberto = await db.inventarios.find_one({"status": "em_andamento"}, {"_id": 0})
    if inventario_aberto:
        raise HTTPException(
            status_code=400, 
            detail="Já existe um inventário em andamento. Finalize-o antes de iniciar um novo."
        )
    
    # Buscar todos os produtos ativos
    produtos = await db.produtos.find({"ativo": True}, {"_id": 0}).to_list(10000)
    
    # Gerar número do inventário
    ultimo_inventario = await db.inventarios.find_one(
        {}, {"_id": 0, "numero": 1}, sort=[("created_at", -1)]
    )
    
    if ultimo_inventario and ultimo_inventario.get("numero"):
        ultimo_num = int(ultimo_inventario["numero"].split("-")[1])
        novo_numero = f"INV-{str(ultimo_num + 1).zfill(3)}"
    else:
        novo_numero = "INV-001"
    
    # Criar itens do inventário
    itens = []
    for produto in produtos:
        itens.append({
            "produto_id": produto["id"],
            "produto_nome": produto["nome"],
            "produto_sku": produto["sku"],
            "estoque_sistema": produto.get("estoque_atual", 0),
            "estoque_contado": None,
            "diferenca": None,
            "observacao": None
        })
    
    # Criar inventário
    inventario = {
        "id": str(uuid.uuid4()),
        "numero": novo_numero,
        "data_inicio": datetime.now(timezone.utc).isoformat(),
        "data_conclusao": None,
        "status": "em_andamento",
        "responsavel_id": current_user["id"],
        "responsavel_nome": current_user["nome"],
        "itens": itens,
        "total_produtos": len(itens),
        "total_contados": 0,
        "total_divergencias": 0,
        "observacoes": observacoes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventarios.insert_one(inventario)
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="estoque",
        acao="iniciar_inventario",
        detalhes={"inventario_id": inventario["id"], "numero": novo_numero, "total_produtos": len(itens)}
    )
    
    return inventario

@api_router.get("/estoque/inventario", response_model=List[Inventario])
async def listar_inventarios(
    status: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_permission("estoque", "ler"))
):
    """Lista todos os inventários"""
    filtro = {}
    if status:
        filtro["status"] = status
    
    if limit == 0:
        inventarios = await db.inventarios.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(10000)
    else:
        inventarios = await db.inventarios.find(filtro, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return inventarios

@api_router.get("/estoque/inventario/{inventario_id}", response_model=Inventario)
async def obter_inventario(
    inventario_id: str,
    current_user: dict = Depends(require_permission("estoque", "ler"))
):
    """Obtém detalhes de um inventário específico"""
    inventario = await db.inventarios.find_one({"id": inventario_id}, {"_id": 0})
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventário não encontrado")
    
    return inventario

@api_router.put("/estoque/inventario/{inventario_id}/registrar-contagem")
async def registrar_contagem(
    inventario_id: str,
    produto_id: str,
    quantidade_contada: int,
    observacao: Optional[str] = None,
    current_user: dict = Depends(require_permission("estoque", "editar"))
):
    """Registra a contagem de um produto no inventário"""
    
    # Buscar inventário
    inventario = await db.inventarios.find_one({"id": inventario_id}, {"_id": 0})
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventário não encontrado")
    
    if inventario["status"] != "em_andamento":
        raise HTTPException(status_code=400, detail="Inventário não está em andamento")
    
    # Atualizar item específico
    itens = inventario["itens"]
    item_encontrado = False
    total_contados = 0
    total_divergencias = 0
    
    for item in itens:
        if item["produto_id"] == produto_id:
            item["estoque_contado"] = quantidade_contada
            item["diferenca"] = quantidade_contada - item["estoque_sistema"]
            item["observacao"] = observacao
            item_encontrado = True
        
        if item.get("estoque_contado") is not None:
            total_contados += 1
            if item.get("diferenca", 0) != 0:
                total_divergencias += 1
    
    if not item_encontrado:
        raise HTTPException(status_code=404, detail="Produto não encontrado no inventário")
    
    # Atualizar inventário
    await db.inventarios.update_one(
        {"id": inventario_id},
        {
            "$set": {
                "itens": itens,
                "total_contados": total_contados,
                "total_divergencias": total_divergencias
            }
        }
    )
    
    return {"message": "Contagem registrada com sucesso"}

@api_router.post("/estoque/inventario/{inventario_id}/finalizar")
async def finalizar_inventario(
    inventario_id: str,
    aplicar_ajustes: bool = True,
    current_user: dict = Depends(require_permission("estoque", "editar"))
):
    """Finaliza o inventário e aplica os ajustes de estoque"""
    
    # Buscar inventário
    inventario = await db.inventarios.find_one({"id": inventario_id}, {"_id": 0})
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventário não encontrado")
    
    if inventario["status"] != "em_andamento":
        raise HTTPException(status_code=400, detail="Inventário não está em andamento")
    
    # Verificar se todos os produtos foram contados
    itens_nao_contados = [item for item in inventario["itens"] if item.get("estoque_contado") is None]
    if itens_nao_contados:
        raise HTTPException(
            status_code=400, 
            detail=f"Existem {len(itens_nao_contados)} produtos sem contagem. Finalize todas as contagens antes de concluir."
        )
    
    ajustes_aplicados = []
    
    if aplicar_ajustes:
        # Aplicar ajustes de estoque
        for item in inventario["itens"]:
            if item.get("diferenca", 0) != 0:
                # Atualizar estoque do produto
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": item["estoque_contado"]}}
                )
                
                # Registrar movimentação
                tipo_mov = "entrada" if item["diferenca"] > 0 else "saida"
                movimentacao = {
                    "id": str(uuid.uuid4()),
                    "produto_id": item["produto_id"],
                    "tipo": tipo_mov,
                    "quantidade": abs(item["diferenca"]),
                    "referencia_tipo": "inventario",
                    "referencia_id": inventario_id,
                    "user_id": current_user["id"],
                    "motivo": f"Ajuste de inventário {inventario['numero']}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await db.movimentacoes_estoque.insert_one(movimentacao)
                
                ajustes_aplicados.append({
                    "produto": item["produto_nome"],
                    "sku": item["produto_sku"],
                    "diferenca": item["diferenca"]
                })
    
    # Atualizar status do inventário
    await db.inventarios.update_one(
        {"id": inventario_id},
        {
            "$set": {
                "status": "concluido",
                "data_conclusao": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="estoque",
        acao="finalizar_inventario",
        detalhes={
            "inventario_id": inventario_id,
            "numero": inventario["numero"],
            "total_divergencias": inventario["total_divergencias"],
            "ajustes_aplicados": len(ajustes_aplicados),
            "aplicou_ajustes": aplicar_ajustes
        }
    )
    
    return {
        "message": "Inventário finalizado com sucesso",
        "total_divergencias": inventario["total_divergencias"],
        "ajustes_aplicados": ajustes_aplicados if aplicar_ajustes else []
    }

@api_router.delete("/estoque/inventario/{inventario_id}/cancelar")
async def cancelar_inventario(
    inventario_id: str,
    motivo: str,
    current_user: dict = Depends(require_permission("estoque", "editar"))
):
    """Cancela um inventário em andamento"""
    
    inventario = await db.inventarios.find_one({"id": inventario_id}, {"_id": 0})
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventário não encontrado")
    
    if inventario["status"] != "em_andamento":
        raise HTTPException(status_code=400, detail="Apenas inventários em andamento podem ser cancelados")
    
    await db.inventarios.update_one(
        {"id": inventario_id},
        {
            "$set": {
                "status": "cancelado",
                "data_conclusao": datetime.now(timezone.utc).isoformat(),
                "observacoes": f"{inventario.get('observacoes', '')} | CANCELADO: {motivo}"
            }
        }
    )
    
    await log_action(
        ip="0.0.0.0",
        user_id=current_user["id"],
        user_nome=current_user["nome"],
        tela="estoque",
        acao="cancelar_inventario",
        detalhes={"inventario_id": inventario_id, "numero": inventario["numero"], "motivo": motivo}
    )
    
    return {"message": "Inventário cancelado com sucesso"}

# ========== NOTAS FISCAIS ==========

# Valor mínimo que requer aprovação (pode ser configurado)
VALOR_MINIMO_APROVACAO = 5000.00

@api_router.get("/notas-fiscais", response_model=List[NotaFiscal])
async def get_notas_fiscais(
    status: str = None,
    fornecedor_id: str = None,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("notas_fiscais", "ler"))
):
    """Lista notas fiscais com filtros e paginação opcional"""
    filtro = {}
    if status:
        filtro["status"] = status
    if fornecedor_id:
        filtro["fornecedor_id"] = fornecedor_id
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        notas = await db.notas_fiscais.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(10000)
    else:
        skip = (page - 1) * limit
        notas = await db.notas_fiscais.find(filtro, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return notas

@api_router.post("/notas-fiscais", response_model=NotaFiscal)
async def create_nota_fiscal(nota_data: NotaFiscalCreate, current_user: dict = Depends(require_permission("notas_fiscais", "criar"))):
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
        # Se data_emissao não tiver timezone, assumir UTC
        if data_emissao.tzinfo is None:
            data_emissao = data_emissao.replace(tzinfo=timezone.utc)
        
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
        pass  # Nota fiscal criada e aguardando aprovação
    
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
    
    # Atualizar estoque e recalcular preços
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
            
            # Recalcular preço médio e preço última compra
            await recalcular_precos_produto(item["produto_id"])
    
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
    current_user: dict = Depends(require_permission("notas_fiscais", "ler"))
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
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("orcamentos", "ler"))
):
    """Lista orçamentos com filtros e paginação opcional"""
    filtro = {}
    if status:
        filtro["status"] = status
    if cliente_id:
        filtro["cliente_id"] = cliente_id
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        orcamentos = await db.orcamentos.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(10000)
    else:
        skip = (page - 1) * limit
        orcamentos = await db.orcamentos.find(filtro, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return orcamentos

@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orcamento_data: OrcamentoCreate, current_user: dict = Depends(require_permission("orcamentos", "criar"))):
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
    if orcamento["status"] not in ["aberto", "aprovado", "em_analise"]:
        raise HTTPException(
            status_code=400,
            detail=f"Apenas orçamentos abertos, aprovados ou em análise podem ser convertidos. Status atual: {orcamento['status']}"
        )
    
    # Validar se não expirou
    data_validade = datetime.fromisoformat(orcamento["data_validade"])
    # Se data_validade não tiver timezone, assumir UTC
    if data_validade.tzinfo is None:
        data_validade = data_validade.replace(tzinfo=timezone.utc)
    
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
    
    # Usar novos itens se fornecidos, senão usar do orçamento
    itens_final = conversao.itens if conversao.itens is not None else orcamento["itens"]
    
    # Se itens foram editados, reverter estoque dos itens originais e validar novos
    if conversao.itens is not None:
        # Reverter estoque dos itens originais do orçamento
        for item in orcamento["itens"]:
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if produto:
                novo_estoque = produto["estoque_atual"] + item["quantidade"]
                await db.produtos.update_one(
                    {"id": item["produto_id"]},
                    {"$set": {"estoque_atual": novo_estoque}}
                )
        
        # Validar e reservar estoque dos novos itens
        for item in itens_final:
            produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
            if not produto:
                raise HTTPException(status_code=404, detail=f"Produto {item['produto_id']} não encontrado")
            
            if produto["estoque_atual"] < item["quantidade"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente para '{produto['nome']}'. Disponível: {produto['estoque_atual']}"
                )
            
            # Reservar estoque
            novo_estoque = produto["estoque_atual"] - item["quantidade"]
            await db.produtos.update_one(
                {"id": item["produto_id"]},
                {"$set": {"estoque_atual": novo_estoque}}
            )
    
    # Usar novo desconto/frete se fornecido, senão usar do orçamento
    desconto_final = conversao.desconto if conversao.desconto is not None else orcamento["desconto"]
    frete_final = conversao.frete if conversao.frete is not None else orcamento["frete"]
    
    # Recalcular total
    subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in itens_final)
    total_final = subtotal - desconto_final + frete_final
    
    # Gerar número sequencial para a venda
    numero_venda = await gerar_proximo_numero_venda()
    
    # Criar venda
    venda = Venda(
        numero_venda=numero_venda,
        cliente_id=orcamento["cliente_id"],
        itens=itens_final,
        desconto=desconto_final,
        frete=frete_final,
        subtotal=subtotal,
        total=total_final,
        forma_pagamento=conversao.forma_pagamento,
        status_venda="aguardando_pagamento",
        orcamento_id=orcamento_id,
        user_id=current_user["id"],
        vendedor_nome=current_user["nome"],
        observacoes=conversao.observacoes,
        historico_alteracoes=[{
            "data": datetime.now(timezone.utc).isoformat(),
            "usuario": current_user["nome"],
            "acao": "conversao_orcamento",
            "detalhes": f"Venda {numero_venda} criada a partir do orçamento {orcamento_id}{' (com itens editados)' if conversao.itens is not None else ''}"
        }]
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
    
    # Atualizar orçamento com os valores finais da conversão
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {
            "status": "vendido",
            "itens": itens_final,
            "subtotal": subtotal,
            "total": total_final,
            "desconto": desconto_final,
            "frete": frete_final,
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
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    
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
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permission("vendas", "ler"))
):
    """Lista vendas com filtros e paginação opcional"""
    filtro = {}
    if status_venda:
        filtro["status_venda"] = status_venda
    if status_entrega:
        filtro["status_entrega"] = status_entrega
    if cliente_id:
        filtro["cliente_id"] = cliente_id
    
    # Se limit=0, retorna todos (mantém compatibilidade)
    if limit == 0:
        vendas = await db.vendas.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(10000)
    else:
        skip = (page - 1) * limit
        vendas = await db.vendas.find(filtro, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return vendas

@api_router.post("/vendas", response_model=Venda)
async def create_venda(venda_data: VendaCreate, current_user: dict = Depends(require_permission("vendas", "criar"))):
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
    
    # Se a venda foi originada de um orçamento, atualizar o orçamento
    if venda.get("orcamento_id"):
        orcamento = await db.orcamentos.find_one({"id": venda["orcamento_id"]}, {"_id": 0})
        if orcamento:
            # Adicionar ao histórico do orçamento
            historico_orcamento = {
                "data": datetime.now(timezone.utc).isoformat(),
                "usuario": current_user["nome"],
                "acao": "cancelamento_venda_vinculada",
                "detalhes": f"Venda cancelada. Motivo: {cancelamento.motivo}"
            }
            
            if "historico_alteracoes" not in orcamento:
                orcamento["historico_alteracoes"] = []
            orcamento["historico_alteracoes"].append(historico_orcamento)
            
            # Atualizar orçamento para status cancelado
            await db.orcamentos.update_one(
                {"id": venda["orcamento_id"]},
                {"$set": {
                    "status": "cancelado",
                    "motivo_cancelamento": cancelamento.motivo,
                    "cancelado_por": current_user["id"],
                    "data_cancelamento": datetime.now(timezone.utc).isoformat(),
                    "historico_alteracoes": orcamento["historico_alteracoes"],
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

@api_router.post("/ia/sugestao-precificacao")
async def sugestao_precificacao(request: PrevisaoDemandaRequest, current_user: dict = Depends(get_current_user)):
    """Sugestão inteligente de precificação usando IA"""
    try:
        produto_id = request.produto_id
        
        # Buscar produto
        produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Buscar marca e categoria
        marca = await db.marcas.find_one({"id": produto.get("marca_id")}, {"_id": 0})
        categoria = await db.categorias.find_one({"id": produto.get("categoria_id")}, {"_id": 0})
        
        # Buscar histórico de vendas
        vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
        
        # Calcular estatísticas de vendas
        quantidade_vendida = 0
        receita_total = 0
        ticket_medio_produto = 0
        vendas_produto = 0
        
        for venda in vendas:
            for item in venda.get("itens", []):
                if item["produto_id"] == produto_id:
                    quantidade_vendida += item["quantidade"]
                    receita_total += item["preco_unitario"] * item["quantidade"]
                    vendas_produto += 1
        
        if vendas_produto > 0:
            ticket_medio_produto = receita_total / vendas_produto
        
        # Buscar produtos similares (mesma categoria)
        produtos_similares = await db.produtos.find(
            {
                "categoria_id": produto.get("categoria_id"),
                "id": {"$ne": produto_id},
                "ativo": True
            },
            {"_id": 0}
        ).limit(10).to_list(10)
        
        precos_similares = [p.get("preco_venda", 0) for p in produtos_similares if p.get("preco_venda")]
        preco_medio_categoria = sum(precos_similares) / len(precos_similares) if precos_similares else 0
        preco_minimo_categoria = min(precos_similares) if precos_similares else 0
        preco_maximo_categoria = max(precos_similares) if precos_similares else 0
        
        # Usar GPT-4 para análise de precificação
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"precificacao-{produto_id}-{datetime.now().isoformat()}",
            system_message="Você é um especialista em precificação estratégica e análise de mercado. Forneça recomendações objetivas e fundamentadas."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Analise a precificação do produto "{produto['nome']}" e forneça sugestões estratégicas:

DADOS DO PRODUTO:
- SKU: {produto['sku']}
- Marca: {marca.get('nome') if marca else 'N/A'}
- Categoria: {categoria.get('nome') if categoria else 'N/A'}
- Preço de Custo Atual: R$ {produto.get('preco_custo', 0):.2f}
- Preço de Venda Atual: R$ {produto.get('preco_venda', 0):.2f}
- Margem de Lucro Atual: {produto.get('margem_lucro', 0):.2f}%
- Estoque Atual: {produto.get('estoque_atual', 0)} unidades

PERFORMANCE DE VENDAS:
- Quantidade Total Vendida: {quantidade_vendida} unidades
- Número de Transações: {vendas_produto} vendas
- Receita Total Gerada: R$ {receita_total:.2f}
- Ticket Médio do Produto: R$ {ticket_medio_produto:.2f}

ANÁLISE DE MERCADO (Produtos Similares na Categoria):
- Preço Médio da Categoria: R$ {preco_medio_categoria:.2f}
- Faixa de Preço: R$ {preco_minimo_categoria:.2f} - R$ {preco_maximo_categoria:.2f}
- Total de Produtos Similares: {len(produtos_similares)}

TAREFA - FORNEÇA UMA ANÁLISE COMPLETA DE PRECIFICAÇÃO:

1. **Análise do Preço Atual**:
   - O preço está adequado? Muito alto ou muito baixo?
   - A margem de lucro é saudável?
   - Como se compara com a média da categoria?

2. **Sugestão de Preço Ótimo**:
   - Calcule um preço de venda sugerido
   - Justifique com base em custos, mercado e performance
   - Considere elasticidade de demanda

3. **Estratégias de Precificação**:
   - Preço premium vs. preço competitivo
   - Possibilidade de promoções
   - Pacotes e combos
   - Precificação psicológica (ex: R$ 99,90 vs R$ 100)

4. **Análise de Margem**:
   - A margem atual é sustentável?
   - Margem ideal para esta categoria
   - Trade-off entre margem e volume

5. **Recomendações Estratégicas**:
   - Ações imediatas (aumentar, diminuir, manter)
   - Impacto esperado nas vendas
   - Riscos e oportunidades

Seja específico nos valores sugeridos e forneça justificativas claras para cada recomendação."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Calcular alguns indicadores adicionais
        markup_atual = ((produto.get('preco_venda', 0) - produto.get('preco_custo', 0)) / produto.get('preco_custo', 1)) * 100
        roi = (receita_total - (produto.get('preco_custo', 0) * quantidade_vendida)) / max(produto.get('preco_custo', 0) * quantidade_vendida, 1) * 100 if quantidade_vendida > 0 else 0
        
        return {
            "success": True,
            "produto": {
                "id": produto["id"],
                "nome": produto["nome"],
                "sku": produto["sku"],
                "marca": marca.get('nome') if marca else 'N/A',
                "categoria": categoria.get('nome') if categoria else 'N/A',
                "preco_custo": produto.get('preco_custo', 0),
                "preco_venda": produto.get('preco_venda', 0),
                "margem_lucro": produto.get('margem_lucro', 0)
            },
            "estatisticas_vendas": {
                "quantidade_vendida": quantidade_vendida,
                "receita_total": round(receita_total, 2),
                "vendas_realizadas": vendas_produto,
                "ticket_medio": round(ticket_medio_produto, 2)
            },
            "analise_mercado": {
                "preco_medio_categoria": round(preco_medio_categoria, 2),
                "preco_minimo_categoria": round(preco_minimo_categoria, 2),
                "preco_maximo_categoria": round(preco_maximo_categoria, 2),
                "produtos_similares": len(produtos_similares)
            },
            "indicadores": {
                "markup_atual": round(markup_atual, 2),
                "roi": round(roi, 2)
            },
            "sugestao_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise de precificação: {str(e)}")

# ========== RELATÓRIOS ==========

@api_router.get("/relatorios/dashboard")
async def get_dashboard(current_user: dict = Depends(require_permission("relatorios", "ler"))):
    # Clientes - separar ativos e inativos
    total_clientes_ativos = await db.clientes.count_documents({"ativo": True})
    total_clientes_inativos = await db.clientes.count_documents({"ativo": False})
    total_clientes = total_clientes_ativos + total_clientes_inativos
    
    # Produtos - separar ativos e inativos
    total_produtos_ativos = await db.produtos.count_documents({"ativo": True})
    total_produtos_inativos = await db.produtos.count_documents({"ativo": False})
    total_produtos = total_produtos_ativos + total_produtos_inativos
    
    # Vendas - apenas efetivadas (não canceladas)
    vendas_efetivadas = await db.vendas.find({
        "$and": [
            {"$or": [{"cancelada": {"$exists": False}}, {"cancelada": False}]},
            {"$or": [{"status": {"$exists": False}}, {"status": {"$ne": "cancelada"}}]}
        ]
    }, {"_id": 0}).to_list(10000)
    
    total_vendas = len(vendas_efetivadas)
    total_faturamento = sum(v["total"] for v in vendas_efetivadas)
    
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    produtos_estoque_baixo = len([p for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]])
    
    return {
        "total_clientes": total_clientes,
        "total_clientes_ativos": total_clientes_ativos,
        "total_clientes_inativos": total_clientes_inativos,
        "total_produtos": total_produtos,
        "total_produtos_ativos": total_produtos_ativos,
        "total_produtos_inativos": total_produtos_inativos,
        "total_vendas": total_vendas,
        "total_faturamento": total_faturamento,
        "produtos_estoque_baixo": produtos_estoque_baixo
    }

@api_router.get("/relatorios/vendas-por-periodo")
async def vendas_por_periodo(current_user: dict = Depends(require_permission("relatorios", "ler"))):
    # Apenas vendas efetivadas (não canceladas)
    vendas = await db.vendas.find({
        "$and": [
            {"$or": [{"cancelada": {"$exists": False}}, {"cancelada": False}]},
            {"$or": [{"status": {"$exists": False}}, {"status": {"$ne": "cancelada"}}]}
        ]
    }, {"_id": 0}).to_list(10000)
    
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

# ========== LOGS AVANÇADOS ==========

# Configuração de retenção
DIAS_RETENCAO_LOGS = 90

@api_router.get("/logs")
async def get_logs(
    data_inicio: str = None,
    data_fim: str = None,
    user_id: str = None,
    severidade: str = None,
    tela: str = None,
    acao: str = None,
    metodo_http: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_permission("logs", "ler"))
):
    """
    Lista logs com filtros avançados e paginação
    """
    # Apenas admin pode ver todos os logs
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem acessar logs")
    
    filtro = {"arquivado": False}
    
    # Aplicar filtros
    if data_inicio and data_fim:
        filtro["timestamp"] = {"$gte": data_inicio, "$lte": data_fim}
    elif data_inicio:
        filtro["timestamp"] = {"$gte": data_inicio}
    elif data_fim:
        filtro["timestamp"] = {"$lte": data_fim}
    
    if user_id:
        filtro["user_id"] = user_id
    if severidade:
        filtro["severidade"] = severidade
    if tela:
        filtro["tela"] = tela
    if acao:
        filtro["acao"] = acao
    if metodo_http:
        filtro["metodo_http"] = metodo_http
    
    # Contar total
    total = await db.logs.count_documents(filtro)
    
    # Buscar logs com paginação
    logs = await db.logs.find(filtro, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total
    }

@api_router.get("/logs/estatisticas")
async def get_estatisticas_logs(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(require_permission("logs", "ler"))
):
    """
    Estatísticas avançadas de logs
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem acessar estatísticas")
    
    filtro = {"arquivado": False}
    if data_inicio and data_fim:
        filtro["timestamp"] = {"$gte": data_inicio, "$lte": data_fim}
    
    logs = await db.logs.find(filtro, {"_id": 0}).to_list(10000)
    
    # Estatísticas por severidade
    por_severidade = {}
    for log in logs:
        sev = log.get("severidade", "INFO")
        if sev not in por_severidade:
            por_severidade[sev] = 0
        por_severidade[sev] += 1
    
    # Estatísticas por usuário
    por_usuario = {}
    for log in logs:
        user = log.get("user_nome", "Desconhecido")
        if user not in por_usuario:
            por_usuario[user] = 0
        por_usuario[user] += 1
    
    # Top 10 usuários mais ativos
    top_usuarios = sorted(por_usuario.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Estatísticas por ação
    por_acao = {}
    for log in logs:
        acao = log.get("acao", "desconhecido")
        if acao not in por_acao:
            por_acao[acao] = 0
        por_acao[acao] += 1
    
    # Estatísticas por tela
    por_tela = {}
    for log in logs:
        tela = log.get("tela", "desconhecido")
        if tela not in por_tela:
            por_tela[tela] = 0
        por_tela[tela] += 1
    
    # Estatísticas por dispositivo
    por_dispositivo = {}
    for log in logs:
        disp = log.get("dispositivo", "Desconhecido")
        if disp and disp != "Desconhecido":
            if disp not in por_dispositivo:
                por_dispositivo[disp] = 0
            por_dispositivo[disp] += 1
    
    # Estatísticas por navegador
    por_navegador = {}
    for log in logs:
        nav = log.get("navegador", "Desconhecido")
        if nav and nav != "Desconhecido":
            if nav not in por_navegador:
                por_navegador[nav] = 0
            por_navegador[nav] += 1
    
    # Performance médio
    tempos_execucao = [log.get("tempo_execucao_ms", 0) for log in logs if log.get("tempo_execucao_ms")]
    tempo_medio = sum(tempos_execucao) / len(tempos_execucao) if tempos_execucao else 0
    
    # Erros
    total_erros = len([log_entry for log_entry in logs if log_entry.get("severidade") in ["ERROR", "CRITICAL"]])
    
    return {
        "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        "total_logs": len(logs),
        "total_erros": total_erros,
        "por_severidade": por_severidade,
        "por_acao": por_acao,
        "por_tela": por_tela,
        "por_dispositivo": por_dispositivo,
        "por_navegador": por_navegador,
        "top_usuarios": [{"usuario": u, "quantidade": q} for u, q in top_usuarios],
        "performance": {
            "tempo_medio_ms": tempo_medio,
            "total_medidas": len(tempos_execucao)
        }
    }

@api_router.get("/logs/dashboard")
async def get_dashboard_logs(current_user: dict = Depends(require_permission("logs", "ler"))):
    """
    Dashboard resumido de logs para os últimos 7 dias
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem acessar o dashboard")
    
    # Últimos 7 dias
    data_inicio = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    logs = await db.logs.find(
        {"timestamp": {"$gte": data_inicio}, "arquivado": False},
        {"_id": 0}
    ).to_list(10000)
    
    # KPIs
    total_logs = len(logs)
    total_erros = len([log_entry for log_entry in logs if log_entry.get("severidade") in ["ERROR", "CRITICAL"]])
    
    # Contar usuários REALMENTE ativos no sistema (não apenas nos logs)
    usuarios_ativos_count = await db.usuarios.count_documents({"ativo": True})
    
    # Atividade por dia
    atividade_por_dia = {}
    for log in logs:
        dia = log["timestamp"][:10]
        if dia not in atividade_por_dia:
            atividade_por_dia[dia] = 0
        atividade_por_dia[dia] += 1
    
    # Logs de segurança recentes (últimos 7 dias)
    logs_seguranca = await db.logs_seguranca.find(
        {"timestamp": {"$gte": data_inicio}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    # Total de logs de segurança nos últimos 7 dias
    total_security = await db.logs_seguranca.count_documents({"timestamp": {"$gte": data_inicio}})
    
    return {
        "periodo": "Últimos 7 dias",
        "kpis": {
            "total_logs": total_logs,
            "total_erros": total_erros,
            "total_security": total_security,
            "usuarios_ativos": usuarios_ativos_count
        },
        "atividade_por_dia": atividade_por_dia,
        "logs_seguranca_recentes": logs_seguranca
    }

@api_router.get("/logs/seguranca")
async def get_logs_seguranca(
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista logs de segurança específicos
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem acessar logs de segurança")
    
    total = await db.logs_seguranca.count_documents({})
    
    logs = await db.logs_seguranca.find({}, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@api_router.get("/logs/exportar")
async def exportar_logs(
    formato: str = "json",  # json, csv
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Exporta logs em diferentes formatos
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem exportar logs")
    
    filtro = {"arquivado": False}
    if data_inicio and data_fim:
        filtro["timestamp"] = {"$gte": data_inicio, "$lte": data_fim}
    
    logs = await db.logs.find(filtro, {"_id": 0}).sort("timestamp", -1).to_list(5000)
    
    if formato == "json":
        return {
            "formato": "json",
            "total": len(logs),
            "logs": logs
        }
    elif formato == "csv":
        # Converter para CSV simplificado
        csv_lines = ["timestamp,user_nome,tela,acao,severidade,ip"]
        for log in logs:
            line = f"{log.get('timestamp')},{log.get('user_nome')},{log.get('tela')},{log.get('acao')},{log.get('severidade')},{log.get('ip')}"
            csv_lines.append(line)
        
        return {
            "formato": "csv",
            "total": len(logs),
            "data": "\n".join(csv_lines)
        }
    else:
        raise HTTPException(status_code=400, detail="Formato inválido. Use 'json' ou 'csv'")

@api_router.post("/logs/arquivar-antigos")
async def arquivar_logs_antigos(current_user: dict = Depends(require_permission("logs", "editar"))):
    """
    Arquiva logs com mais de X dias (apenas admin)
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem arquivar logs")
    
    # Data limite
    data_limite = (datetime.now(timezone.utc) - timedelta(days=DIAS_RETENCAO_LOGS)).isoformat()
    
    # Contar logs a arquivar
    filtro = {
        "timestamp": {"$lt": data_limite},
        "arquivado": False
    }
    
    total_arquivar = await db.logs.count_documents(filtro)
    
    # Arquivar
    resultado = await db.logs.update_many(
        filtro,
        {"$set": {
            "arquivado": True,
            "data_arquivamento": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"{total_arquivar} logs arquivados com sucesso",
        "total_arquivados": resultado.modified_count,
        "data_limite": data_limite,
        "dias_retencao": DIAS_RETENCAO_LOGS
    }

@api_router.get("/logs/atividade-suspeita")
async def verificar_atividade_suspeita(current_user: dict = Depends(require_permission("logs", "ler"))):
    """
    Verifica atividades suspeitas no sistema
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem verificar atividades suspeitas")
    
    # Últimas 24 horas
    data_inicio = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    # Buscar múltiplos logins falhos por IP
    logs_seg = await db.logs_seguranca.find(
        {"timestamp": {"$gte": data_inicio}, "tipo": "login_falho"},
        {"_id": 0}
    ).to_list(1000)
    
    # Agrupar por IP
    por_ip = {}
    for log in logs_seg:
        ip = log.get("ip")
        if ip not in por_ip:
            por_ip[ip] = []
        por_ip[ip].append(log)
    
    # IPs suspeitos (5+ tentativas falhas)
    ips_suspeitos = []
    for ip, logs_ip in por_ip.items():
        if len(logs_ip) >= 5:
            ips_suspeitos.append({
                "ip": ip,
                "tentativas": len(logs_ip),
                "ultima_tentativa": logs_ip[0]["timestamp"],
                "emails_tentados": list(set(log_entry.get("user_email") for log_entry in logs_ip if log_entry.get("user_email")))
            })
    
    # Acessos negados
    acessos_negados = await db.logs_seguranca.find(
        {"timestamp": {"$gte": data_inicio}, "tipo": "acesso_negado"},
        {"_id": 0}
    ).limit(20).to_list(20)
    
    return {
        "periodo": "Últimas 24 horas",
        "ips_suspeitos": ips_suspeitos,
        "total_ips_suspeitos": len(ips_suspeitos),
        "acessos_negados_recentes": len(acessos_negados),
        "detalhes_acessos_negados": acessos_negados[:10]
    }

@api_router.post("/logs/criar-indices")
async def criar_indices_logs(current_user: dict = Depends(require_permission("logs", "editar"))):
    """
    Cria índices no MongoDB para otimização de queries (apenas admin)
    """
    # RBAC: Verificação manual removida - agora usa Depends(require_permission)
    #     if current_user["papel"] != "admin":
    #         raise HTTPException(status_code=403, detail="Apenas administradores podem criar índices")
    
    try:
        # Criar índices
        await db.logs.create_index([("timestamp", -1)])
        await db.logs.create_index([("user_id", 1)])
        await db.logs.create_index([("severidade", 1)])
        await db.logs.create_index([("tela", 1)])
        await db.logs.create_index([("acao", 1)])
        await db.logs.create_index([("arquivado", 1)])
        await db.logs.create_index([("request_id", 1)])
        
        await db.logs_seguranca.create_index([("timestamp", -1)])
        await db.logs_seguranca.create_index([("tipo", 1)])
        await db.logs_seguranca.create_index([("ip", 1)])
        
        return {"message": "Índices criados com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar índices: {str(e)}")

# ========== RELATÓRIOS AVANÇADOS ==========

@api_router.get("/relatorios/dashboard/kpis")
async def get_kpis_dashboard(data_inicio: str = None, data_fim: str = None, current_user: dict = Depends(require_permission("relatorios", "ler"))):
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
    current_user: dict = Depends(require_permission("relatorios", "ler"))
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
    current_user: dict = Depends(require_permission("relatorios", "ler"))
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
    current_user: dict = Depends(require_permission("relatorios", "ler"))
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
async def relatorio_curva_abc(current_user: dict = Depends(require_permission("relatorios", "ler"))):
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
async def relatorio_rfm(current_user: dict = Depends(require_permission("relatorios", "ler"))):
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
    current_user: dict = Depends(require_permission("relatorios", "ler"))
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
    current_user: dict = Depends(require_permission("relatorios", "ler"))
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

# ========== ENDPOINTS ADMINISTRATIVOS ==========

# Modelos Pydantic para Admin
class AdminDeleteVendasRequest(BaseModel):
    dias: int
    senha_mestra: str

class AdminDeleteOrcamentosRequest(BaseModel):
    dias: int
    senha_mestra: str

class AdminLimparLogsRequest(BaseModel):
    dias: int
    senha_mestra: str

class AdminResetarModuloRequest(BaseModel):
    modulo: str
    senha_mestra: str

class AdminRemoverTesteRequest(BaseModel):
    senha_mestra: str

class AdminLimparTudoRequest(BaseModel):
    senha_mestra: str
    confirmar: str

@api_router.post("/admin/estatisticas")
async def admin_get_estatisticas(current_user: dict = Depends(require_permission("admin", "ler"))):
    """Retorna estatísticas gerais do sistema para o painel administrativo"""
    try:
        stats = {
            "vendas": await db.vendas.count_documents({}),
            "vendas_canceladas": await db.vendas.count_documents({"$or": [{"cancelada": True}, {"status": "cancelada"}]}),
            "orcamentos": await db.orcamentos.count_documents({}),
            "notas_fiscais": await db.notas_fiscais.count_documents({}),
            "produtos": await db.produtos.count_documents({}),
            "clientes": await db.clientes.count_documents({}),
            "fornecedores": await db.fornecedores.count_documents({}),
            "logs": await db.logs.count_documents({}),
            "logs_seguranca": await db.logs_seguranca.count_documents({}),
            "usuarios": await db.usuarios.count_documents({}),
            "movimentacoes_estoque": await db.movimentacoes_estoque.count_documents({}),
            "inventarios": await db.inventarios.count_documents({})
        }
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/delete-vendas-antigas")
async def admin_delete_vendas_antigas(
    request: AdminDeleteVendasRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """Deleta vendas mais antigas que X dias"""
    # Verificar senha mestra
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    try:
        data_limite = (datetime.now(timezone.utc) - timedelta(days=request.dias)).isoformat()
        
        # Deletar vendas antigas
        result = await db.vendas.delete_many({"created_at": {"$lt": data_limite}})
        
        # Log de auditoria
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="deletar_vendas_antigas",
            detalhes={"dias": request.dias, "vendas_deletadas": result.deleted_count}
        )
        
        return {
            "success": True,
            "message": f"{result.deleted_count} vendas deletadas",
            "deletadas": result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/delete-orcamentos-antigos")
async def admin_delete_orcamentos_antigos(
    request: AdminDeleteOrcamentosRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """Deleta orçamentos mais antigos que X dias"""
    # Verificar senha mestra
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    try:
        data_limite = (datetime.now(timezone.utc) - timedelta(days=request.dias)).isoformat()
        
        # Deletar orçamentos antigos
        result = await db.orcamentos.delete_many({"created_at": {"$lt": data_limite}})
        
        # Log de auditoria
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="deletar_orcamentos_antigos",
            detalhes={"dias": request.dias, "orcamentos_deletados": result.deleted_count}
        )
        
        return {
            "success": True,
            "message": f"{result.deleted_count} orçamentos deletados",
            "deletadas": result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/limpar-logs")
async def admin_limpar_logs(
    request: AdminLimparLogsRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """Limpa logs mais antigos que X dias"""
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    try:
        data_limite = (datetime.now(timezone.utc) - timedelta(days=request.dias)).isoformat()
        
        # Deletar logs antigos
        result_logs = await db.logs.delete_many({"timestamp": {"$lt": data_limite}})
        result_security = await db.logs_seguranca.delete_many({"timestamp": {"$lt": data_limite}})
        
        total = result_logs.deleted_count + result_security.deleted_count
        
        # Log de auditoria
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="limpar_logs",
            detalhes={"dias": request.dias, "logs_deletados": result_logs.deleted_count, "logs_seguranca_deletados": result_security.deleted_count}
        )
        
        return {
            "success": True,
            "message": f"{total} logs deletados",
            "logs_sistema": result_logs.deleted_count,
            "logs_seguranca": result_security.deleted_count,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/resetar-modulo")
async def admin_resetar_modulo(
    request: AdminResetarModuloRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """Reseta completamente um módulo (deleta todos os dados)"""
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    modulos_validos = {
        "vendas": "vendas",
        "orcamentos": "orcamentos",
        "notas_fiscais": "notas_fiscais",
        "produtos": "produtos",
        "movimentacoes_estoque": "movimentacoes_estoque",
        "inventarios": "inventarios",
        "logs": "logs"
    }
    
    if request.modulo not in modulos_validos:
        raise HTTPException(status_code=400, detail="Módulo inválido")
    
    try:
        collection_name = modulos_validos[request.modulo]
        
        # Deletar tudo
        result = await db[collection_name].delete_many({})
        
        # Log de auditoria
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="resetar_modulo",
            detalhes={"modulo": request.modulo, "registros_deletados": result.deleted_count}
        )
        
        return {
            "success": True,
            "message": f"Módulo '{request.modulo}' resetado: {result.deleted_count} registros deletados",
            "deletados": result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/remover-dados-teste")
async def admin_remover_dados_teste(
    request: AdminRemoverTesteRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """Remove dados de teste baseado em critérios (emails de teste, nomes genéricos, etc)"""
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    try:
        deletados = {}
        
        # Clientes de teste (emails teste, cpf/cnpj padrões)
        result_clientes = await db.clientes.delete_many({
            "$or": [
                {"email": {"$regex": "teste|test|demo", "$options": "i"}},
                {"nome": {"$regex": "teste|test|demo", "$options": "i"}},
                {"cpf_cnpj": {"$in": ["00000000000", "11111111111", "00000000000000", "11111111111111"]}}
            ]
        })
        deletados["clientes"] = result_clientes.deleted_count
        
        # Fornecedores de teste
        result_fornecedores = await db.fornecedores.delete_many({
            "$or": [
                {"email": {"$regex": "teste|test|demo", "$options": "i"}},
                {"razao_social": {"$regex": "teste|test|demo", "$options": "i"}},
                {"cnpj": {"$in": ["00000000000000", "11111111111111"]}}
            ]
        })
        deletados["fornecedores"] = result_fornecedores.deleted_count
        
        # Produtos de teste
        result_produtos = await db.produtos.delete_many({
            "$or": [
                {"nome": {"$regex": "teste|test|demo", "$options": "i"}},
                {"sku": {"$regex": "TEST|DEMO", "$options": "i"}}
            ]
        })
        deletados["produtos"] = result_produtos.deleted_count
        
        # Usuários de teste (exceto admin principal)
        result_usuarios = await db.usuarios.delete_many({
            "$and": [
                {"$or": [
                    {"email": {"$regex": "teste|test|demo", "$options": "i"}},
                    {"nome": {"$regex": "teste|test|demo", "$options": "i"}}
                ]},
                {"papel": {"$ne": "admin"}}  # Não deletar admin
            ]
        })
        deletados["usuarios"] = result_usuarios.deleted_count
        
        total = sum(deletados.values())
        
        # Log de auditoria
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="remover_dados_teste",
            detalhes={"deletados": deletados, "total": total}
        )
        
        return {
            "success": True,
            "message": f"Dados de teste removidos: {total} registros",
            "detalhes": deletados,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/limpar-tudo")
async def admin_limpar_tudo(
    request: AdminLimparTudoRequest,
    current_user: dict = Depends(require_permission("admin", "deletar"))
):
    """CUIDADO: Limpa TODOS os dados do sistema (exceto Usuários e Papéis/Permissões)"""
    if request.senha_mestra != os.environ.get('ADMIN_MASTER_PASSWORD'):
        raise HTTPException(status_code=403, detail="Senha mestra incorreta")
    
    if request.confirmar != "LIMPAR TUDO":
        raise HTTPException(status_code=400, detail="Confirmação inválida. Digite 'LIMPAR TUDO'")
    
    try:
        deletados = {}
        
        # Deletar vendas e orçamentos
        deletados["vendas"] = (await db.vendas.delete_many({})).deleted_count
        deletados["orcamentos"] = (await db.orcamentos.delete_many({})).deleted_count
        deletados["notas_fiscais"] = (await db.notas_fiscais.delete_many({})).deleted_count
        
        # Deletar estoque
        deletados["movimentacoes_estoque"] = (await db.movimentacoes_estoque.delete_many({})).deleted_count
        deletados["inventarios"] = (await db.inventarios.delete_many({})).deleted_count
        
        # Deletar produtos e cadastros
        deletados["produtos"] = (await db.produtos.delete_many({})).deleted_count
        deletados["clientes"] = (await db.clientes.delete_many({})).deleted_count
        deletados["fornecedores"] = (await db.fornecedores.delete_many({})).deleted_count
        deletados["marcas"] = (await db.marcas.delete_many({})).deleted_count
        deletados["categorias"] = (await db.categorias.delete_many({})).deleted_count
        deletados["subcategorias"] = (await db.subcategorias.delete_many({})).deleted_count
        
        # Deletar TODOS os logs (incluindo este comando será o último log antes da limpeza)
        deletados["logs"] = (await db.logs.delete_many({})).deleted_count
        deletados["logs_seguranca"] = (await db.logs_seguranca.delete_many({})).deleted_count
        
        # PRESERVAR: Usuários, Roles (Papéis) e Permissões
        # NÃO deletar: usuarios, roles, user_roles, permissions
        # LOGS: Todos os logs são deletados (incluindo o log desta ação que será gerado após)
        
        total = sum(deletados.values())
        
        # Log de auditoria crítico
        await log_action(
            ip="0.0.0.0",
            user_id=current_user["id"],
            user_nome=current_user["nome"],
            tela="administracao",
            acao="limpar_tudo_sistema",
            detalhes={"deletados": deletados, "total": total, "CRITICO": True}
        )
        
        return {
            "success": True,
            "message": f"Sistema limpo: {total} registros deletados",
            "detalhes": deletados,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/logs-auditoria")
async def admin_get_logs_auditoria(
    limit: int = 50,
    current_user: dict = Depends(require_permission("admin", "ler"))
):
    """Retorna logs de auditoria das ações administrativas"""
    try:
        logs = await db.logs.find(
            {"tela": "administracao"},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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