// ============================================
// 1. MÓDULO CNPJ - Consulta Receita Federal
// packages/api/src/modules/cnpj/cnpj.service.ts
// ============================================

import axios from 'axios';
import { Cache } from '../../core/cache';
import { Logger } from '../../core/logger';
import { QueryLogger } from '../../core/query-logger';

interface CNPJData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnae: string;
  atividadePrincipal: string;
  situacaoCadastral: string;
  dataAbertura: string;
  capitalSocial: number;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  socios: Array<{
    nome: string;
    qualificacao: string;
    dataEntrada: string;
    participacao?: string;
  }>;
}

export class CNPJService {
  private cache: Cache;
  private logger: Logger;
  private queryLogger: QueryLogger;

  // API oficial da Receita Federal (gratuita)
  private RECEITA_API = 'https://receitaws.com.br/v1/cnpj/';
  // Alternativa: https://brasilapi.com.br/api/cnpj/v1/

  constructor() {
    this.cache = new Cache();
    this.logger = new Logger('CNPJService');
    this.queryLogger = new QueryLogger();
  }

  async consultar(cnpj: string, userId: string): Promise<CNPJData> {
    try {
      // Validar CNPJ
      const cnpjLimpo = this.limparCNPJ(cnpj);
      if (!this.validarCNPJ(cnpjLimpo)) {
        throw new Error('CNPJ inválido');
      }

      // Log da consulta (LGPD compliance)
      await this.queryLogger.log({
        userId,
        type: 'CNPJ',
        query: cnpjLimpo,
        timestamp: new Date()
      });

      // Verificar cache (1 hora)
      const cacheKey = `cnpj:${cnpjLimpo}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info(`CNPJ ${cnpjLimpo} retornado do cache`);
        return cached;
      }

      // Consultar API da Receita Federal
      this.logger.info(`Consultando CNPJ ${cnpjLimpo} na Receita Federal`);
      const response = await axios.get(`${this.RECEITA_API}${cnpjLimpo}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'InfoHub-Pro/1.0'
        }
      });

      if (response.data.status === 'ERROR') {
        throw new Error(response.data.message || 'Erro ao consultar CNPJ');
      }

      const data = this.normalizarDados(response.data);

      // Salvar no cache
      await this.cache.set(cacheKey, data, 3600); // 1 hora

      // Salvar no banco para histórico
      await this.salvarHistorico(cnpjLimpo, data);

      return data;
    } catch (error) {
      this.logger.error(`Erro ao consultar CNPJ ${cnpj}:`, error);
      throw error;
    }
  }

  private limparCNPJ(cnpj: string): string {
    return cnpj.replace(/[^\d]/g, '');
  }

  private validarCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Validação do dígito verificador
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  }

  private normalizarDados(data: any): CNPJData {
    return {
      cnpj: data.cnpj,
      razaoSocial: data.nome,
      nomeFantasia: data.fantasia,
      cnae: data.atividade_principal?.[0]?.code || '',
      atividadePrincipal: data.atividade_principal?.[0]?.text || '',
      situacaoCadastral: data.situacao,
      dataAbertura: data.abertura,
      capitalSocial: parseFloat(data.capital_social || '0'),
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep
      },
      socios: (data.qsa || []).map((socio: any) => ({
        nome: socio.nome,
        qualificacao: socio.qual,
        dataEntrada: socio.data_entrada,
        participacao: socio.participacao
      }))
    };
  }

  private async salvarHistorico(cnpj: string, data: CNPJData) {
    // Salvar no banco de dados para histórico
    // Implementar com Prisma ou TypeORM
  }
}

// ============================================
// 2. MÓDULO PROCESSOS JUDICIAIS
// packages/api/src/modules/processos/processo.service.ts
// ============================================

import { CheerioCrawler } from 'crawlee';

interface ProcessoJudicial {
  numero: string;
  tribunal: string;
  classe: string;
  assunto: string;
  dataDistribuicao: string;
  status: string;
  partes: Array<{
    tipo: 'AUTOR' | 'REU';
    nome: string;
    documento?: string;
  }>;
  movimentacoes: Array<{
    data: string;
    descricao: string;
  }>;
  valorCausa?: number;
}

export class ProcessoService {
  private logger: Logger;
  private queryLogger: QueryLogger;

  constructor() {
    this.logger = new Logger('ProcessoService');
    this.queryLogger = new QueryLogger();
  }

  async buscarProcessos(params: {
    nome?: string;
    cnpj?: string;
    tribunal: string;
    userId: string;
  }): Promise<ProcessoJudicial[]> {
    try {
      // Log da consulta
      await this.queryLogger.log({
        userId: params.userId,
        type: 'PROCESSO',
        query: params.nome || params.cnpj || '',
        tribunal: params.tribunal,
        timestamp: new Date()
      });

      // Buscar de acordo com o tribunal
      switch (params.tribunal.toUpperCase()) {
        case 'TJSP':
          return await this.buscarTJSP(params);
        case 'TJRJ':
          return await this.buscarTJRJ(params);
        case 'TRF1':
          return await this.buscarTRF(params, 1);
        default:
          throw new Error('Tribunal não suportado');
      }
    } catch (error) {
      this.logger.error('Erro ao buscar processos:', error);
      throw error;
    }
  }

  private async buscarTJSP(params: any): Promise<ProcessoJudicial[]> {
    const processos: ProcessoJudicial[] = [];

    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 10,
      async requestHandler({ request, $, log }) {
        // Extrair dados do processo
        const numero = $('#numeroProcesso').text().trim();
        const classe = $('.classeProcesso').text().trim();
        const assunto = $('.assuntoProcesso').text().trim();

        // Extrair partes
        const partes: any[] = [];
        $('.parteProcesso').each((i, elem) => {
          const tipo = $(elem).find('.tipoParticipacao').text().trim();
          const nome = $(elem).find('.nomeParticipante').text().trim();
          partes.push({
            tipo: tipo.includes('Autor') ? 'AUTOR' : 'REU',
            nome
          });
        });

        // Extrair movimentações
        const movimentacoes: any[] = [];
        $('.movimentacaoProcesso').each((i, elem) => {
          const data = $(elem).find('.dataMovimentacao').text().trim();
          const descricao = $(elem).find('.descricaoMovimentacao').text().trim();
          movimentacoes.push({ data, descricao });
        });

        if (numero) {
          processos.push({
            numero,
            tribunal: 'TJSP',
            classe,
            assunto,
            dataDistribuicao: '',
            status: 'Em andamento',
            partes,
            movimentacoes
          });
        }
      }
    });

    // URL de consulta do TJSP (exemplo - verificar URL real)
    await crawler.run([
      `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&dadosConsulta.localPesquisa.cdLocal=-1&cbPesquisa=NMPARTE&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsulta=${params.nome}`
    ]);

    return processos;
  }

  private async buscarTJRJ(params: any): Promise<ProcessoJudicial[]> {
    // Implementar scraping do TJRJ
    return [];
  }

  private async buscarTRF(params: any, regiao: number): Promise<ProcessoJudicial[]> {
    // Implementar scraping dos TRFs
    return [];
  }
}

// ============================================
// 3. MÓDULO OSINT
// packages/api/src/modules/osint/osint.service.ts
// ============================================

interface OSINTProfile {
  email?: string;
  telefone?: string;
  nome?: string;
  socialMedia: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  domains: string[];
  breaches: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  reputation: {
    score: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export class OSINTService {
  private logger: Logger;
  private queryLogger: QueryLogger;

  constructor() {
    this.logger = new Logger('OSINTService');
    this.queryLogger = new QueryLogger();
  }

  async investigar(params: {
    email?: string;
    telefone?: string;
    nome?: string;
    userId: string;
  }): Promise<OSINTProfile> {
    try {
      // Log da consulta
      await this.queryLogger.log({
        userId: params.userId,
        type: 'OSINT',
        query: params.email || params.telefone || params.nome || '',
        timestamp: new Date()
      });

      const profile: OSINTProfile = {
        email: params.email,
        telefone: params.telefone,
        nome: params.nome,
        socialMedia: {},
        domains: [],
        breaches: [],
        reputation: {
          score: 0,
          risk: 'LOW'
        }
      };

      // 1. Verificar vazamentos de dados (HaveIBeenPwned)
      if (params.email) {
        profile.breaches = await this.verificarVazamentos(params.email);
      }

      // 2. Buscar perfis em redes sociais (apenas públicos)
      if (params.nome) {
        profile.socialMedia = await this.buscarRedesSociais(params.nome);
      }

      // 3. Verificar domínios relacionados
      if (params.email) {
        const domain = params.email.split('@')[1];
        profile.domains = await this.analisarDominio(domain);
      }

      // 4. Calcular score de reputação
      profile.reputation = this.calcularReputacao(profile);

      return profile;
    } catch (error) {
      this.logger.error('Erro na investigação OSINT:', error);
      throw error;
    }
  }

  private async verificarVazamentos(email: string): Promise<any[]> {
    try {
      // API HaveIBeenPwned (requer API key)
      const response = await axios.get(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${email}`,
        {
          headers: {
            'hibp-api-key': process.env.HIBP_API_KEY || ''
          }
        }
      );

      return response.data.map((breach: any) => ({
        name: breach.Name,
        date: breach.BreachDate,
        description: breach.Description
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return []; // Nenhum vazamento encontrado
      }
      throw error;
    }
  }

  private async buscarRedesSociais(nome: string): Promise<any> {
    // Buscar perfis públicos em redes sociais
    // IMPORTANTE: Apenas dados públicos, respeitando termos de serviço
    const socialMedia: any = {};

    // LinkedIn (exemplo - usar API oficial se disponível)
    // Facebook, Instagram, Twitter - apenas dados públicos

    return socialMedia;
  }

  private async analisarDominio(domain: string): Promise<string[]> {
    try {
      // WHOIS lookup
      const response = await axios.get(`https://api.whoisxml.com/v1/${domain}`);
      return [domain];
    } catch (error) {
      return [];
    }
  }

  private calcularReputacao(profile: OSINTProfile): any {
    let score = 100;
    let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    // Reduzir score por vazamentos
    score -= profile.breaches.length * 10;

    // Avaliar risco
    if (profile.breaches.length > 5) {
      risk = 'HIGH';
    } else if (profile.breaches.length > 2) {
      risk = 'MEDIUM';
    }

    return {
      score: Math.max(0, score),
      risk
    };
  }
}

// ============================================
// 4. MÓDULO KYC/KYB
// packages/api/src/modules/kyc/kyc.service.ts
// ============================================

interface KYCResult {
  status: 'APPROVED' | 'REJECTED' | 'REVIEW';
  score: number;
  checks: {
    documentValidation: boolean;
    pepCheck: boolean;
    sanctionsList: boolean;
    adverseMedia: boolean;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
}

export class KYCService {
  private logger: Logger;
  private cnpjService: CNPJService;
  private processoService: ProcessoService;
  private osintService: OSINTService;

  constructor() {
    this.logger = new Logger('KYCService');
    this.cnpjService = new CNPJService();
    this.processoService = new ProcessoService();
    this.osintService = new OSINTService();
  }

  async verificar(params: {
    tipo: 'PF' | 'PJ';
    documento: string;
    nome: string;
    userId: string;
  }): Promise<KYCResult> {
    try {
      const result: KYCResult = {
        status: 'APPROVED',
        score: 100,
        checks: {
          documentValidation: false,
          pepCheck: false,
          sanctionsList: false,
          adverseMedia: false
        },
        riskLevel: 'LOW',
        recommendations: []
      };

      // 1. Validar documento
      if (params.tipo === 'PJ') {
        const cnpjData = await this.cnpjService.consultar(params.documento, params.userId);
        result.checks.documentValidation = cnpjData.situacaoCadastral === 'ATIVA';
        
        if (!result.checks.documentValidation) {
          result.score -= 50;
          result.recommendations.push('CNPJ com situação irregular');
        }
      }

      // 2. Verificar PEP (Pessoas Politicamente Expostas)
      result.checks.pepCheck = await this.verificarPEP(params.nome);
      if (result.checks.pepCheck) {
        result.score -= 20;
        result.riskLevel = 'HIGH';
        result.recommendations.push('Pessoa Politicamente Exposta - Atenção redobrada necessária');
      }

      // 3. Verificar listas de sanções
      result.checks.sanctionsList = await this.verificarSancoes(params.nome);
      if (result.checks.sanctionsList) {
        result.score -= 100;
        result.status = 'REJECTED';
        result.riskLevel = 'HIGH';
        result.recommendations.push('BLOQUEIO: Consta em lista de sanções');
      }

      // 4. Buscar processos judiciais
      const processos = await this.processoService.buscarProcessos({
        nome: params.nome,
        cnpj: params.tipo === 'PJ' ? params.documento : undefined,
        tribunal: 'TJSP',
        userId: params.userId
      });

      if (processos.length > 10) {
        result.score -= 30;
        result.riskLevel = 'MEDIUM';
        result.recommendations.push(`${processos.length} processos judiciais encontrados`);
      }

      // 5. Análise OSINT
      const osintData = await this.osintService.investigar({
        nome: params.nome,
        userId: params.userId
      });

      if (osintData.breaches.length > 0) {
        result.score -= 15;
        result.recommendations.push(`${osintData.breaches.length} vazamentos de dados identificados`);
      }

      // Determinar status final
      if (result.score < 50) {
        result.status = 'REJECTED';
      } else if (result.score < 70) {
        result.status = 'REVIEW';
      }

      return result;
    } catch (error) {
      this.logger.error('Erro na verificação KYC:', error);
      throw error;
    }
  }

  private async verificarPEP(nome: string): Promise<boolean> {
    // Verificar em listas de PEP públicas
    // Exemplo: Portal da Transparência, TSE, etc.
    return false;
  }

  private async verificarSancoes(nome: string): Promise<boolean> {
    // Verificar listas de sanções (OFAC, ONU, UE, etc.)
    return false;
  }
}

// ============================================
// 5. CONTROLLER PRINCIPAL
// packages/api/src/controllers/search.controller.ts
// ============================================

import { Request, Response } from 'express';
import { RateLimiter } from '../core/rate-limiter';

export class SearchController {
  private cnpjService: CNPJService;
  private processoService: ProcessoService;
  private osintService: OSINTService;
  private kycService: KYCService;
  private rateLimiter: RateLimiter;

  constructor() {
    this.cnpjService = new CNPJService();
    this.processoService = new ProcessoService();
    this.osintService = new OSINTService();
    this.kycService = new KYCService();
    this.rateLimiter = new RateLimiter();
  }

  async consultarCNPJ(req: Request, res: Response) {
    try {
      // Verificar rate limit
      await this.rateLimiter.check(req.user.id, 'cnpj');

      const { cnpj } = req.params;
      const data = await this.cnpjService.consultar(cnpj, req.user.id);

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async buscarProcessos(req: Request, res: Response) {
    try {
      await this.rateLimiter.check(req.user.id, 'processo');

      const { nome, cnpj, tribunal } = req.query;
      const data = await this.processoService.buscarProcessos({
        nome: nome as string,
        cnpj: cnpj as string,
        tribunal: tribunal as string,
        userId: req.user.id
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async investigarOSINT(req: Request, res: Response) {
    try {
      await this.rateLimiter.check(req.user.id, 'osint');

      const { email, telefone, nome } = req.query;
      const data = await this.osintService.investigar({
        email: email as string,
        telefone: telefone as string,
        nome: nome as string,
        userId: req.user.id
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async verificarKYC(req: Request, res: Response) {
    try {
      await this.rateLimiter.check(req.user.id, 'kyc');

      const { tipo, documento, nome } = req.body;
      const data = await this.kycService.verificar({
        tipo,
        documento,
        nome,
        userId: req.user.id
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}