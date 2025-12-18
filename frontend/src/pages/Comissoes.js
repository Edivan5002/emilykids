import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Users, 
  CheckCircle, 
  Clock, 
  Filter, 
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Comissoes = () => {
  const [comissoes, setComissoes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [selecionadas, setSelecionadas] = useState([]);
  const [filtros, setFiltros] = useState({
    vendedor_id: '',
    status: '',
    data_inicio: '',
    data_fim: ''
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [relatorioDialog, setRelatorioDialog] = useState(false);
  
  const ITENS_POR_PAGINA = 20;

  useEffect(() => {
    fetchComissoes();
    fetchVendedores();
  }, [paginaAtual, filtros]);

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', paginaAtual);
      params.append('limit', ITENS_POR_PAGINA);
      if (filtros.vendedor_id) params.append('vendedor_id', filtros.vendedor_id);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);

      const response = await axios.get(`${API}/comissoes?${params.toString()}`);
      setComissoes(response.data.data || []);
      setMeta(response.data.meta || {});
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await axios.get(`${API}/usuarios?papel=vendedor&limit=0`);
      const data = response.data?.data || response.data || [];
      setVendedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Erro ao carregar vendedores');
    }
  };

  const fetchRelatorio = async () => {
    if (!filtros.data_inicio || !filtros.data_fim) {
      toast.error('Selecione o período para gerar o relatório');
      return;
    }
    try {
      const response = await axios.get(
        `${API}/comissoes/relatorio?data_inicio=${filtros.data_inicio}&data_fim=${filtros.data_fim}`
      );
      setRelatorio(response.data);
      setRelatorioDialog(true);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  const handlePagarSelecionadas = async () => {
    if (selecionadas.length === 0) {
      toast.error('Selecione ao menos uma comissão');
      return;
    }
    try {
      await axios.post(`${API}/comissoes/pagar`, selecionadas);
      toast.success('Comissões marcadas como pagas!');
      setSelecionadas([]);
      fetchComissoes();
    } catch (error) {
      toast.error('Erro ao pagar comissões');
    }
  };

  const toggleSelecao = (id) => {
    setSelecionadas(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodas = () => {
    const pendentes = comissoes.filter(c => c.status === 'pendente').map(c => c.id);
    if (selecionadas.length === pendentes.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(pendentes);
    }
  };

  const totalPendente = meta.total_pendente || 0;
  const totalPago = meta.total_pago || 0;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <DollarSign className="text-green-600" />
        Comissões de Vendedores
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Pago</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="text-blue-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Total Registros</p>
                <p className="text-xl font-bold">{meta.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-purple-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Selecionadas</p>
                <p className="text-xl font-bold text-purple-600">{selecionadas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label>Vendedor</Label>
              <Select 
                value={filtros.vendedor_id} 
                onValueChange={(v) => setFiltros({...filtros, vendedor_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={filtros.status || "all"} 
                onValueChange={(v) => setFiltros({...filtros, status: v === "all" ? "" : v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input 
                type="date" 
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input 
                type="date" 
                value={filtros.data_fim}
                onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchComissoes} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              <Button onClick={fetchRelatorio} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações em Lote */}
      {selecionadas.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-blue-700">
            {selecionadas.length} comissão(ões) selecionada(s)
          </span>
          <Button onClick={handlePagarSelecionadas} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Pagas
          </Button>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">
                    <input 
                      type="checkbox" 
                      onChange={toggleTodas}
                      checked={selecionadas.length > 0 && selecionadas.length === comissoes.filter(c => c.status === 'pendente').length}
                    />
                  </th>
                  <th className="p-3 text-left">Vendedor</th>
                  <th className="p-3 text-left">Venda</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-right">Valor Venda</th>
                  <th className="p-3 text-right">% Comissão</th>
                  <th className="p-3 text-right">Valor Comissão</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : comissoes.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-500">
                      Nenhuma comissão encontrada
                    </td>
                  </tr>
                ) : (
                  comissoes.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {c.status === 'pendente' && (
                          <input 
                            type="checkbox"
                            checked={selecionadas.includes(c.id)}
                            onChange={() => toggleSelecao(c.id)}
                          />
                        )}
                      </td>
                      <td className="p-3 font-medium">{c.vendedor_nome}</td>
                      <td className="p-3">{c.venda_numero}</td>
                      <td className="p-3">{c.cliente_nome}</td>
                      <td className="p-3">{new Date(c.data_venda).toLocaleDateString()}</td>
                      <td className="p-3 text-right">R$ {c.valor_venda?.toFixed(2)}</td>
                      <td className="p-3 text-right">{c.percentual_comissao?.toFixed(1)}%</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        R$ {c.valor_comissao?.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          c.status === 'pago' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {meta.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Página {paginaAtual} de {meta.pages}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={paginaAtual === meta.pages}
              onClick={() => setPaginaAtual(p => p + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Relatório */}
      <Dialog open={relatorioDialog} onOpenChange={setRelatorioDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Relatório de Comissões</DialogTitle>
          </DialogHeader>
          {relatorio && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Período: {filtros.data_inicio} a {filtros.data_fim}
              </p>
              
              {/* Totais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Total Vendas</p>
                  <p className="text-lg font-bold">R$ {relatorio.totais?.total_vendas?.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Total Comissão</p>
                  <p className="text-lg font-bold text-green-600">R$ {relatorio.totais?.total_comissao?.toFixed(2)}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Pendente</p>
                  <p className="text-lg font-bold text-yellow-600">R$ {relatorio.totais?.comissao_pendente?.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Pago</p>
                  <p className="text-lg font-bold text-purple-600">R$ {relatorio.totais?.comissao_paga?.toFixed(2)}</p>
                </div>
              </div>

              {/* Gráfico por Vendedor */}
              {relatorio.vendedores?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Comissão por Vendedor</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={relatorio.vendedores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="vendedor_nome" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_comissao" fill="#10b981" name="Comissão Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabela de Vendedores */}
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Vendedor</th>
                    <th className="p-2 text-right">Vendas</th>
                    <th className="p-2 text-right">Total Vendas</th>
                    <th className="p-2 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.vendedores?.map((v, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{v.vendedor_nome}</td>
                      <td className="p-2 text-right">{v.quantidade_vendas}</td>
                      <td className="p-2 text-right">R$ {v.total_vendas?.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold text-green-600">R$ {v.total_comissao?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Comissoes;
