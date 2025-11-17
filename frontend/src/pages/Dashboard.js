import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Package, ShoppingCart, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [vendasPorPeriodo, setVendasPorPeriodo] = useState([]);
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar se tem permissão em um módulo
  const hasPermission = (module) => {
    if (!user?.permissoes) return false;
    if (user?.papel === 'admin') return true;
    return user.permissoes.some(perm => perm.startsWith(`${module}:`));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const requests = [];
      
      // Só buscar dados se tiver permissão
      if (hasPermission('relatorios')) {
        requests.push(
          axios.get(`${API}/relatorios/dashboard`).catch(err => ({ data: null })),
          axios.get(`${API}/relatorios/vendas-por-periodo`).catch(err => ({ data: {} }))
        );
      } else {
        requests.push(
          Promise.resolve({ data: null }),
          Promise.resolve({ data: {} })
        );
      }
      
      if (hasPermission('estoque')) {
        requests.push(axios.get(`${API}/estoque/alertas`).catch(err => ({ data: null })));
      } else {
        requests.push(Promise.resolve({ data: null }));
      }

      const [statsRes, vendasRes, alertasRes] = await Promise.all(requests);

      setStats(statsRes.data);
      
      if (vendasRes.data && Object.keys(vendasRes.data).length > 0) {
        const vendasArray = Object.entries(vendasRes.data).map(([data, info]) => ({
          data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          quantidade: info.quantidade,
          total: info.total
        })).slice(-7);
        setVendasPorPeriodo(vendasArray);
      }
      
      setAlertas(alertasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats?.total_clientes || 0,
      subtitle: `${stats?.total_clientes_ativos || 0} ativos • ${stats?.total_clientes_inativos || 0} inativos`,
      icon: Users,
      color: 'bg-blue-500',
      testid: 'total-clientes-card'
    },
    {
      title: 'Total de Produtos',
      value: stats?.total_produtos || 0,
      subtitle: `${stats?.total_produtos_ativos || 0} ativos • ${stats?.total_produtos_inativos || 0} inativos`,
      icon: Package,
      color: 'bg-green-500',
      testid: 'total-produtos-card'
    },
    {
      title: 'Total de Vendas',
      value: stats?.total_vendas || 0,
      subtitle: 'Vendas efetivadas',
      icon: ShoppingCart,
      color: 'bg-purple-500',
      testid: 'total-vendas-card'
    },
    {
      title: 'Faturamento Total',
      value: `R$ ${(stats?.total_faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: 'Vendas efetivadas',
      icon: DollarSign,
      color: 'bg-yellow-500',
      testid: 'faturamento-card'
    }
  ];

  return (
    <div className="page-container" data-testid="dashboard-page">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-4xl font-bold" style={{color: '#F26C4F'}}>E</span>
          <span className="text-4xl font-bold" style={{color: '#F4A261'}}>M</span>
          <span className="text-4xl font-bold" style={{color: '#267698'}}>I</span>
          <span className="text-4xl font-bold" style={{color: '#2C9AA1'}}>L</span>
          <span className="text-4xl font-bold" style={{color: '#E76F51'}}>Y</span>
          <span className="text-4xl font-bold ml-2" style={{color: '#3A3A3A'}}>KIDS</span>
        </div>
        <p className="text-gray-600">Visão geral do seu negócio</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid mb-6 sm:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-hover" data-testid={stat.testid}>
              <CardContent className="card-content-responsive">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`${stat.color} p-4 rounded-xl`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas de Estoque */}
      {alertas && (alertas.alertas_minimo.length > 0 || alertas.alertas_maximo.length > 0) && (
        <Card className="mb-8" data-testid="alertas-estoque-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-orange-500" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.alertas_minimo.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-600 mb-2">Estoque Mínimo Atingido ({alertas.alertas_minimo.length})</h3>
                <div className="space-y-1">
                  {alertas.alertas_minimo.slice(0, 5).map(produto => (
                    <p key={produto.id} className="text-sm text-gray-600">
                      {produto.nome} - Estoque: {produto.estoque_atual}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {alertas.alertas_maximo.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-600 mb-2">Estoque Máximo Atingido ({alertas.alertas_maximo.length})</h3>
                <div className="space-y-1">
                  {alertas.alertas_maximo.slice(0, 5).map(produto => (
                    <p key={produto.id} className="text-sm text-gray-600">
                      {produto.nome} - Estoque: {produto.estoque_atual}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vendas por Período */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card data-testid="vendas-chart-card">
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendasPorPeriodo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="faturamento-chart-card">
          <CardHeader>
            <CardTitle>Faturamento dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasPorPeriodo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#10b981" name="Faturamento" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;