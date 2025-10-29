import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Brain,
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
  UserCog
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
    { path: '/marcas', label: 'Marcas', icon: Tag },
    { path: '/categorias', label: 'Categorias', icon: Folder },
    { path: '/subcategorias', label: 'Subcategorias', icon: Layers },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/estoque', label: 'Estoque', icon: Package },
    { path: '/notas-fiscais', label: 'Notas Fiscais', icon: Receipt },
    { path: '/orcamentos', label: 'Orçamentos', icon: ClipboardList },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { path: '/ia-insights', label: 'IA Insights', icon: Brain },
    { path: '/logs', label: 'Logs', icon: History }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`sidebar fixed top-0 left-0 h-full z-40 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
        style={{backgroundColor: '#F7F4E9'}}
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
            {menuItems.map((item) => {
              const Icon = item.icon;
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
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;