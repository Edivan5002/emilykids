import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  History,
  Menu,
  X,
  LogOut,
  Tag,
  Folder,
  Layers,
  Truck,
  Receipt,
  ClipboardList,
  UserCog,
  Shield,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

// Componente para ícone Emily Kids (boneca com balão)
const EmilyIcon = ({ size = 20, className = "" }) => (
  <img 
    src="/boneca.png" 
    alt="Emily Kids" 
    style={{ width: size, height: size }}
    className={`inline-block ${className}`}
  />
);

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cadastrosOpen, setCadastrosOpen] = useState(true); // Estado para menu Cadastros
  const [financeiroOpen, setFinanceiroOpen] = useState(true); // Estado para menu Financeiro
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Função para verificar se usuário tem permissão em um módulo
  const hasModulePermission = (module) => {
    // Admin sempre tem acesso
    if (user?.papel === 'admin') return true;
    
    // Se não tem permissões definidas, não tem acesso
    if (!user?.permissoes) return false;
    
    // Verifica se tem qualquer permissão (ler, criar, editar, deletar) no módulo
    return user.permissoes.some(perm => 
      perm.startsWith(`${module}:`)
    );
  };
  
  // Debug: log quando user mudar
  useEffect(() => {
    console.log('User changed:', user);
    console.log('User papel:', user?.papel);
    console.log('User permissoes:', user?.permissoes?.length);
  }, [user]);

  // Detectar tamanho da tela e ajustar sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Em mobile, sidebar começa fechada
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    // Chamar na montagem
    handleResize();

    // Adicionar listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fechar sidebar em mobile após navegação
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, // Dashboard sempre visível
    { path: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
    { path: '/papeis-permissoes', label: 'Papéis & Permissões', icon: Shield, adminOnly: true },
    { path: '/administracao', label: 'Administração', icon: Shield, adminOnly: true, className: 'text-red-600' },
    { 
      label: 'Cadastros', 
      icon: FolderOpen, 
      isSubmenu: true,
      children: [
        { path: '/clientes', label: 'Clientes', icon: Users, module: 'clientes' },
        { path: '/fornecedores', label: 'Fornecedores', icon: Truck, module: 'fornecedores' },
        { path: '/marcas', label: 'Marcas', icon: Tag, module: 'marcas' },
        { path: '/categorias', label: 'Categorias', icon: Folder, module: 'categorias' },
        { path: '/subcategorias', label: 'Subcategorias', icon: Layers, module: 'subcategorias' }
      ]
    },
    { path: '/produtos', label: 'Produtos', icon: Package, module: 'produtos' },
    { path: '/estoque', label: 'Estoque', icon: Package, module: 'estoque' },
    { path: '/notas-fiscais', label: 'Notas Fiscais', icon: Receipt, module: 'notas_fiscais' },
    { path: '/orcamentos', label: 'Orçamentos', icon: ClipboardList, module: 'orcamentos' },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart, module: 'vendas' },
    { 
      label: 'Financeiro', 
      icon: DollarSign, 
      isSubmenu: true,
      children: [
        { path: '/contas-receber', label: 'Contas a Receber', icon: TrendingUp, module: 'contas_receber' },
        { path: '/contas-pagar', label: 'Contas a Pagar', icon: TrendingDown, module: 'contas_pagar' },
        { path: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: Activity, module: 'contas_receber' }
      ]
    },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3, module: 'relatorios' },
    { path: '/ia-insights', label: 'IA Insights', icon: EmilyIcon, module: 'ia_insights' },
    { path: '/logs', label: 'Logs', icon: History, module: 'logs' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{backgroundColor: '#F5F2E9'}}>
      {/* Backdrop para mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar fixed top-0 left-0 h-full z-40 transition-all duration-300 ${
          isMobile
            ? sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
            : sidebarOpen ? 'w-64' : 'w-20'
        }`}
        style={{backgroundColor: '#F5F2E9'}}
      >
        <div className="h-full flex flex-col"
             style={{color: '#3A3A3A'}}>
          {/* Logo */}
          <div className="p-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-2xl font-bold" style={{color: '#F26C4F'}}>E</span>
                    <span className="text-2xl font-bold" style={{color: '#F4A261'}}>M</span>
                    <span className="text-2xl font-bold" style={{color: '#267698'}}>I</span>
                    <span className="text-2xl font-bold" style={{color: '#2C9AA1'}}>L</span>
                    <span className="text-2xl font-bold" style={{color: '#E76F51'}}>Y</span>
                  </div>
                  <span className="text-sm font-semibold" style={{color: '#3A3A3A'}}>KIDS</span>
                </div>
              )}
              <button
                data-testid="sidebar-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded hover:bg-gray-200"
                style={{color: '#3A3A3A'}}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            {menuItems.map((item, index) => {
              // Esconder itens adminOnly se não for admin
              if (item.adminOnly && user?.papel !== 'admin') {
                return null;
              }
              
              // Verificar permissão do módulo (apenas se não for admin e item tiver módulo definido)
              if (item.module && user?.papel !== 'admin' && !hasModulePermission(item.module)) {
                return null;
              }
              
              const Icon = item.icon;
              
              // Se for um submenu (Cadastros)
              if (item.isSubmenu) {
                // Filtrar filhos por permissão
                const visibleChildren = item.children?.filter(child => {
                  // Admin vê tudo
                  if (user?.papel === 'admin') return true;
                  // Se não tem módulo definido, mostrar
                  if (!child.module) return true;
                  // Verificar permissão
                  return hasModulePermission(child.module);
                }) || [];
                
                // Se não há filhos visíveis, não mostrar o submenu
                if (visibleChildren.length === 0) {
                  return null;
                }
                
                const hasActiveChild = visibleChildren.some(child => location.pathname === child.path);
                return (
                  <div key={index}>
                    {/* Menu pai - Cadastros */}
                    <div
                      data-testid={`menu-item-${item.label.toLowerCase().replace(/ /g, '-')}`}
                      onClick={() => setCadastrosOpen(!cadastrosOpen)}
                      className={`sidebar-item mx-2 mb-1 flex items-center gap-3`}
                      style={{
                        backgroundColor: hasActiveChild ? '#267698' : 'transparent',
                        color: hasActiveChild ? '#FFFFFF' : '#3A3A3A',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!hasActiveChild) {
                          e.currentTarget.style.backgroundColor = '#E5E5E5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasActiveChild) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon size={20} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {cadastrosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                      )}
                    </div>
                    
                    {/* Subitens - Clientes, Fornecedores, etc */}
                    {cadastrosOpen && sidebarOpen && visibleChildren && (
                      <div className="ml-4">
                        {visibleChildren.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location.pathname === child.path;
                          return (
                            <div
                              key={child.path}
                              data-testid={`menu-item-${child.label.toLowerCase().replace(/ /g, '-')}`}
                              onClick={() => navigate(child.path)}
                              className={`sidebar-item mx-2 mb-1 flex items-center gap-3`}
                              style={{
                                backgroundColor: isChildActive ? '#2C9AA1' : 'transparent',
                                color: isChildActive ? '#FFFFFF' : '#3A3A3A',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem'
                              }}
                              onMouseEnter={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = '#E5E5E5';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <ChildIcon size={18} />
                              <span>{child.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Menu item normal
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  data-testid={`menu-item-${item.label.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => navigate(item.path)}
                  className={`sidebar-item mx-2 mb-1 flex items-center gap-3`}
                  style={{
                    backgroundColor: isActive ? '#267698' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#3A3A3A',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#E5E5E5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>

          {/* User Info */}
          <div className="p-4 border-t border-gray-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                   style={{backgroundColor: '#267698'}}>
                {user?.nome?.charAt(0)}
              </div>
              {sidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{color: '#3A3A3A'}}>{user?.nome}</p>
                  <p className="text-xs" style={{color: '#6B7280'}}>{user?.papel}</p>
                </div>
              )}
              <button
                data-testid="logout-btn"
                onClick={handleLogout}
                className="p-2 rounded hover:bg-gray-200"
                style={{color: '#3A3A3A'}}
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isMobile ? 'ml-0' : sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Header mobile com botão de menu */}
        {isMobile && (
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold" style={{color: '#F26C4F'}}>E</span>
              <span className="text-xl font-bold" style={{color: '#F4A261'}}>M</span>
              <span className="text-xl font-bold" style={{color: '#267698'}}>I</span>
              <span className="text-xl font-bold" style={{color: '#2C9AA1'}}>L</span>
              <span className="text-xl font-bold" style={{color: '#E76F51'}}>Y</span>
              <span className="text-sm font-semibold ml-1" style={{color: '#3A3A3A'}}>KIDS</span>
            </div>
            <div className="w-10" /> {/* Spacer para centralizar logo */}
          </div>
        )}
        
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;