import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Package,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuditoriaEstoque = () => {
  const [auditoria, setAuditoria] = useState(null);
  const [lotesVencendo, setLotesVencendo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogReconciliar, setDialogReconciliar] = useState({ open: false, produto: null });
  const [formReconciliar, setFormReconciliar] = useState({ estoque_fisico: '', motivo: '' });
  const [diasLotes, setDiasLotes] = useState(90);

  useEffect(() => {
    fetchAuditoria();
    fetchLotesVencendo();
  }, []);

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/estoque/auditoria`);
      setAuditoria(response.data);
    } catch (error) {
      toast.error('Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  const fetchLotesVencendo = async () => {
    try {
      const response = await axios.get(`${API}/estoque/lotes-vencendo?dias=${diasLotes}`);
      setLotesVencendo(response.data.alertas || []);
    } catch (error) {
      console.log('Erro ao carregar lotes');
    }
  };

  const abrirReconciliar = (produto) => {
    setDialogReconciliar({ open: true, produto });
    setFormReconciliar({ estoque_fisico: produto.estoque_sistema.toString(), motivo: '' });
  };

  const reconciliar = async () => {
    if (!formReconciliar.motivo) {
      toast.error('Informe o motivo do ajuste');
      return;
    }
    try {
      const response = await axios.post(`${API}/estoque/reconciliar/${dialogReconciliar.produto.produto_id}`, {
        estoque_fisico: parseInt(formReconciliar.estoque_fisico),
        motivo: formReconciliar.motivo
      });
      toast.success(response.data.message);
      setDialogReconciliar({ open: false, produto: null });
      fetchAuditoria();
    } catch (error) {
      toast.error('Erro ao reconciliar estoque');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="text-blue-600" />
          Auditoria de Estoque
        </h1>
        <Button onClick={fetchAuditoria}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="auditoria">
        <TabsList className="mb-4">
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="lotes">Lotes Vencendo</TabsTrigger>
        </TabsList>

        <TabsContent value="auditoria">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="text-blue-500" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Total Produtos</p>
                    <p className="text-xl font-bold">{auditoria?.total_produtos || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Com Divergência</p>
                    <p className="text-xl font-bold text-red-600">{auditoria?.produtos_com_divergencia || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Corretos</p>
                    <p className="text-xl font-bold text-green-600">
                      {(auditoria?.total_produtos || 0) - (auditoria?.produtos_com_divergencia || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Divergências */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                Divergências Encontradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center">Carregando...</div>
              ) : auditoria?.divergencias?.length === 0 ? (
                <div className="p-8 text-center text-green-600 flex flex-col items-center">
                  <CheckCircle size={48} className="mb-2" />
                  <p className="font-semibold">Nenhuma divergência encontrada!</p>
                  <p className="text-sm text-gray-500">O estoque do sistema está consistente com as movimentações.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left">SKU</th>
                        <th className="p-3 text-left">Produto</th>
                        <th className="p-3 text-right">Estoque Sistema</th>
                        <th className="p-3 text-right">Estoque Calculado</th>
                        <th className="p-3 text-right">Diferença</th>
                        <th className="p-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoria?.divergencias?.map((d, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-sm">{d.sku}</td>
                          <td className="p-3">{d.produto_nome}</td>
                          <td className="p-3 text-right">{d.estoque_sistema}</td>
                          <td className="p-3 text-right">{d.estoque_calculado}</td>
                          <td className="p-3 text-right">
                            <span className={`flex items-center justify-end gap-1 ${d.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {d.diferenca > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                              {Math.abs(d.diferenca)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button variant="outline" size="sm" onClick={() => abrirReconciliar(d)}>
                              Reconciliar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lotes">
          {/* Filtro de Dias */}
          <div className="flex items-center gap-4 mb-4">
            <Label>Alertar lotes vencendo em:</Label>
            <Input type="number" value={diasLotes} onChange={(e) => setDiasLotes(e.target.value)} className="w-24" />
            <span>dias</span>
            <Button variant="outline" onClick={fetchLotesVencendo}>Buscar</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-orange-500" size={20} />
                Lotes Próximos do Vencimento ({lotesVencendo.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lotesVencendo.length === 0 ? (
                <div className="p-8 text-center text-green-600 flex flex-col items-center">
                  <CheckCircle size={48} className="mb-2" />
                  <p className="font-semibold">Nenhum lote vencendo!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left">Produto</th>
                        <th className="p-3 text-left">Lote</th>
                        <th className="p-3 text-right">Quantidade</th>
                        <th className="p-3 text-left">Validade</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotesVencendo.map((l, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3">{l.produto_nome}</td>
                          <td className="p-3 font-mono">{l.lote}</td>
                          <td className="p-3 text-right">{l.quantidade}</td>
                          <td className="p-3">{new Date(l.data_validade).toLocaleDateString()}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${l.vencido ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {l.vencido ? 'VENCIDO' : 'Vencendo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Reconciliar */}
      <Dialog open={dialogReconciliar.open} onOpenChange={(open) => setDialogReconciliar({...dialogReconciliar, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconciliar Estoque</DialogTitle>
          </DialogHeader>
          {dialogReconciliar.produto && (
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">{dialogReconciliar.produto.produto_nome}</p>
                <p className="text-sm text-gray-600">SKU: {dialogReconciliar.produto.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estoque Sistema</Label>
                  <Input value={dialogReconciliar.produto.estoque_sistema} disabled />
                </div>
                <div>
                  <Label>Estoque Físico (contagem)</Label>
                  <Input type="number" value={formReconciliar.estoque_fisico} onChange={(e) => setFormReconciliar({...formReconciliar, estoque_fisico: e.target.value})} />
                </div>
              </div>
              <div>
                <Label>Motivo do Ajuste *</Label>
                <Input value={formReconciliar.motivo} onChange={(e) => setFormReconciliar({...formReconciliar, motivo: e.target.value})} placeholder="Ex: Contagem física de inventário" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogReconciliar({open: false, produto: null})}>Cancelar</Button>
                <Button onClick={reconciliar}>Confirmar Ajuste</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditoriaEstoque;
