import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Leads from './pages/comercial/Leads';
import Pipeline from './pages/comercial/Pipeline';
import Clientes from './pages/clientes/Clientes';
import Operacional from './pages/operacional/Operacional';
import ClientTaskDashboard from './pages/operacional/ClientTaskDashboard';
import Financeiro from './pages/financeiro/Financeiro';
import Conteudo from './pages/conteudo/Conteudo';
import FunilList from './pages/funil/FunilList';
import FunilBuilder from './pages/funil/FunilBuilder';
import Configuracoes from './pages/configuracoes/Configuracoes';
import Admin from './pages/admin/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/operacional" element={<Operacional />} />
          <Route path="/operacional/:clientId" element={<ClientTaskDashboard />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/conteudo" element={<Conteudo />} />
          <Route path="/funil" element={<FunilList />} />
          <Route path="/funil/:funnelId" element={<FunilBuilder />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
