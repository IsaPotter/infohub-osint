// ============================================
// ARQUIVO CENTRAL DE TIPOS
// c:/Users/isabe/OneDrive/Desktop/IbHub/packages/frontend/src/types/index.ts
// Este arquivo serve como a única fonte da verdade para os tipos de dados.
// ============================================

export interface CnpjResult {
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: 'ATIVA' | string;
  capitalSocial: number;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  socios: {
    nome: string;
    qualificacao: string;
    participacao?: string;
  }[];
}

export interface ProcessoResult {
  numero: string;
  classe: string;
  assunto: string;
  tribunal: string;
  status: string;
}

export interface OsintResult {
  reputation: {
    score: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  breaches: {
    name: string;
    date: string;
    description: string;
  }[];
  socialMedia: Record<string, string>;
}

export interface KycResult {
  status: 'APPROVED' | 'REVIEW' | 'REJECTED';
  score: number;
  checks: Record<string, boolean>;
  recommendations: string[];
}
