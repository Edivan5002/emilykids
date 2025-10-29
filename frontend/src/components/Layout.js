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
  ClipboardList
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
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <h1 className="text-xl font-bold text-white">InventoAI</h1>
              )}
              <button
                data-testid="sidebar-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded hover:bg-gray-700"
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
                  className={`sidebar-item mx-2 mb-1 flex items-center gap-3 ${
                    isActive ? 'active' : ''
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>

          {/* User Info */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.nome?.charAt(0)}
              </div>
              {sidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{user?.nome}</p>
                  <p className="text-xs text-gray-400">{user?.papel}</p>
                </div>
              )}
              <button
                data-testid="logout-btn"
                onClick={handleLogout}
                className="p-2 rounded hover:bg-gray-700"
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