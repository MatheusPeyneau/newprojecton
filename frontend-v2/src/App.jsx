import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './components/shared/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<PlaceholderPage section="leads" title="Leads" />} />
          <Route path="/pipeline" element={<PlaceholderPage section="pipeline" title="Pipeline" />} />
          <Route path="/clientes" element={<PlaceholderPage section="clientes" title="Clientes" />} />
          <Route path="/operacional" element={<PlaceholderPage section="operacional" title="Operacional" />} />
          <Route path="/financeiro" element={<PlaceholderPage section="financeiro" title="Financeiro" />} />
          <Route path="/conteudo" element={<PlaceholderPage section="conteudo" title="Conteúdo" />} />
          <Route path="/funil" element={<PlaceholderPage section="funil" title="Funil" />} />
          <Route path="/configuracoes" element={<PlaceholderPage section="configuracoes" title="Configurações" />} />
          <Route path="/admin" element={<PlaceholderPage section="admin" title="Admin" />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
