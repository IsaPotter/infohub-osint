import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { CnpjResult, ProcessoResult, OsintResult, KycResult } from '../types';

// ============================================
// Hook Genérico para chamadas de API
// ============================================

// Este hook foi refatorado para aceitar uma função assíncrona (a chamada da API real).
// Isso o torna mais flexível e pronto para produção.
const useApi = <T, P extends any[]>(
  apiFunc: (...args: P) => Promise<T>
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (...args: P) => {
    // Reseta o estado anterior
    setLoading(true);
    setError(null); // Limpa o erro anterior
    setData(null);

    try {
      const response = await apiFunc(...args);
      setData(response);
    } catch (err: unknown) {
      // Tratamento de erro mais robusto
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado.');
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { loading, error, data, execute };
};

// Função utilitária para construir URLs com query strings de forma segura.
const buildUrl = (path: string, params: Record<string, string> | URLSearchParams): string => {
  // Remove chaves com valores vazios para não poluir a URL (ex: &query=)
  const filteredParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''));

  const searchParams = new URLSearchParams(filteredParams);
  return `${path}?${searchParams.toString()}`;
};

// Cliente de API genérico que substitui o simulador.
// Ele lida com chamadas fetch, tratamento de erros HTTP e parsing de JSON.
const apiClient = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Tenta extrair uma mensagem de erro do corpo da resposta, senão usa o statusText.
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.message || response.statusText;
    throw new Error(`Erro ${response.status}: ${errorMessage}`);
  }

  // Retorna o corpo da resposta como JSON.
  // Se o corpo for vazio (ex: em um status 204), retorna null.
  return response.json().catch(() => null) as Promise<T>;
};

// ============================================
// Hook: Consulta CNPJ
// ============================================
export const useConsultaCnpj = () => {
  const [cnpj, setCnpj] = useState('');
  // A função da API agora chama o apiClient com o endpoint correto.
  // O CNPJ é passado como um parâmetro na URL.
  const { loading, error, data, execute } = useApi((params: { cnpj: string }) =>
    apiClient<CnpjResult>(`/cnpj/${encodeURIComponent(params.cnpj)}`)
  );

  return {
    cnpj,
    setCnpj,
    loading,
    error,
    result: data, // Renomeado para 'result' para manter a consistência com o componente
    handleSearch: () => {
      // Adiciona validação para não buscar CNPJs vazios
      if (!cnpj) return;
      execute({ cnpj });
    },
  };
};

// ============================================
// Hook: Busca de Processos
// ============================================
export const useBuscaProcessos = () => {
  const [nome, setNome] = useState('');
  const [tribunal, setTribunal] = useState('TJSP');
  // Os parâmetros de busca são passados como query string na URL.
  const { loading, error, data, execute } = useApi((params: Record<string, string>) =>
    apiClient<ProcessoResult[]>(buildUrl('/processos', params))
  );

  return {
    nome,
    setNome,
    tribunal,
    setTribunal,
    loading,
    error,.
    results: data || [],
    handleSearch: () => {
      if (!nome) return;
      execute({ nome, tribunal });
    },
  };
};

// ============================================
// Hook: Investigação OSINT
// ============================================
export const useInvestigacaoOsint = () => {
  const [email, setEmail] = useState('');
  // Para enviar dados sensíveis como um email, usamos um método POST.
  const { loading, error, data, execute } = useApi((params: { email: string }) =>
    apiClient<OsintResult>('/osint', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  );

  return {
    email,
    setEmail,
    loading,
    error,
    result: data,
    handleSearch: () => {
      if (!email) return;
      execute({ email });
    },
  };
};

// ============================================
// Hook: Verificação KYC
// ============================================
export const useVerificacaoKyc = () => {
  const [tipo, setTipo] = useState('PJ');
  const [documento, setDocumento] = useState('');
  const [nome, setNome] = useState('');
  // A verificação KYC também usa um método POST para enviar múltiplos campos.
  const { loading, error, data, execute } = useApi((params: { tipo: string; documento: string; nome: string }) =>
    apiClient<KycResult>('/kyc', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  );

  return {
    tipo,
    // Ao mudar o tipo, limpa o campo de documento para evitar inconsistências
    setTipo: (newTipo: string) => {
      setTipo(newTipo);
      setDocumento('');
    },
    documento,
    setDocumento,
    nome,
    setNome,
    loading,
    error,
    result: data,
    handleVerify: () => {
      if (!documento || !nome) return;
      execute({ tipo, documento, nome });
    },
  };
};
