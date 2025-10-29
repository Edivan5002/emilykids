import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Logs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/logs`);
      setLogs(response.data);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    }
  };

  const getAcaoColor = (acao) => {
    switch (acao) {
      case 'login': return 'badge-info';
      case 'logout': return 'badge-warning';
      case 'criar': return 'badge-success';
      case 'editar': return 'badge-warning';
      case 'deletar': return 'badge-danger';
      case 'erro': return 'badge-danger';
      default: return 'badge';
    }
  };

  return (
    <div className="page-container" data-testid="logs-page">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <History size={32} className="text-blue-500" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Logs do Sistema</h1>
            <p className="text-gray-600">Histórico de atividades e auditoria</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getAcaoColor(log.acao)}`}>{log.acao}</span>
                    <span className="font-medium">{log.user_nome}</span>
                    <span className="text-gray-500">-</span>
                    <span className="text-gray-600">{log.tela}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  IP: {log.ip}
                </div>
              </div>
            ))}
          </div>
          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nenhum log registrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;