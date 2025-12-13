'use client';

// Todos os imports devem estar no topo do arquivo.
import { useState, useCallback } from 'react';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Importando os hooks customizados
import { useConsultaCnpj, useBuscaProcessos, useInvestigacaoOsint, useVerificacaoKyc } from '../../../hooks/useInfohub';
import { CnpjResult, ProcessoResult, OsintResult, KycResult } from '../../../types';

// ============================================
// PÁGINA PRINCIPAL DO DASHBOARD
// ============================================

export default function DashboardPage() {

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <Tabs defaultValue="cnpj" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="cnpj">CNPJ</TabsTrigger>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="osint">OSINT</TabsTrigger>
            <TabsTrigger value="kyc">KYC/KYB</TabsTrigger>
          </TabsList>

          {/* CNPJ Tab */}
          <TabsContent value="cnpj">
            <ConsultaCNPJ />
          </TabsContent>

          {/* Processos Tab */}
          <TabsContent value="processos">
            <BuscaProcessos />
          </TabsContent>

          {/* OSINT Tab */}
          <TabsContent value="osint">
            <InvestigacaoOSINT />
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <VerificacaoKYC />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================
// Componente: Consulta CNPJ
// ============================================

function ConsultaCNPJ() {
  const { cnpj, setCnpj, loading, result, error, handleSearch } = useConsultaCnpj();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Consulta CNPJ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCnpj(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm text-gray-600">Razão Social</p>
                <p className="text-lg">{result.razaoSocial}</p>
              </div>

              <div>
                <p className="font-semibold text-sm text-gray-600">Nome Fantasia</p>
                <p className="text-lg">{result.nomeFantasia || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-sm text-gray-600">Situação</p>
                  <p className={`text-lg ${
                    result.situacaoCadastral === 'ATIVA' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.situacaoCadastral}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-sm text-gray-600">Capital Social</p>
                  <p className="text-lg">
                    R$ {result.capitalSocial.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-sm text-gray-600 mb-2">Endereço</p>
                <p>
                  {result.endereco.logradouro}, {result.endereco.numero}
                  {result.endereco.complemento && ` - ${result.endereco.complemento}`}
                </p>
                <p>
                  {result.endereco.bairro} - {result.endereco.municipio}/{result.endereco.uf}
                </p>
                <p>CEP: {result.endereco.cep}</p>
              </div>

              {result.socios && result.socios.length > 0 && (
                <div>
                  <p className="font-semibold text-sm text-gray-600 mb-2">
                    Quadro Societário
                  </p>
                  <div className="space-y-2">
                    {result.socios.map((socio, i: number) => (
                      <div key={i} className="border-l-2 border-blue-500 pl-3">
                        <p className="font-medium">{socio.nome}</p>
                        <p className="text-sm text-gray-600">{socio.qualificacao}</p>
                        {socio.participacao && (
                          <p className="text-sm">Participação: {socio.participacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Componente: Busca de Processos
// ============================================

function BuscaProcessos() {
  const { nome, setNome, tribunal, setTribunal, loading, results, error, handleSearch } = useBuscaProcessos();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Busca de Processos Judiciais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Nome ou Razão Social"
              value={nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
            />
            <select
              value={tribunal}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTribunal(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="TJSP">TJ-SP</option>
              <option value="TJRJ">TJ-RJ</option>
              <option value="TJMG">TJ-MG</option>
              <option value="TRF1">TRF-1</option>
              <option value="TRF2">TRF-2</option>
            </select>
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? 'Buscando...' : 'Buscar Processos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{results.length} Processos Encontrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((processo, i: number) => (
                <div key={i} className="border-b pb-4 last:border-b-0">
                  <p className="font-mono text-sm text-blue-600">
                    {processo.numero}
                  </p>
                  <p className="font-semibold mt-1">{processo.classe}</p>
                  <p className="text-sm text-gray-600">{processo.assunto}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {processo.tribunal}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {processo.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Componente: Investigação OSINT
// ============================================

function InvestigacaoOSINT() {
  const { email, setEmail, loading, result, error, handleSearch } = useInvestigacaoOsint();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Investigação OSINT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Email para investigar"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Investigando...' : 'Investigar'}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            ⚠️ Apenas dados públicos e com consentimento
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Score de Reputação */}
          <Card>
            <CardHeader>
              <CardTitle>Score de Reputação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">
                  {result.reputation.score}/100
                </div>
                <div>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    result.reputation.risk === 'LOW' 
                      ? 'bg-green-100 text-green-800'
                      : result.reputation.risk === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Risco: {result.reputation.risk}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vazamentos */}
          {result.breaches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">
                  ⚠️ Vazamentos Detectados ({result.breaches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.breaches.map((breach, i: number) => (
                    <div key={i} className="border-l-2 border-red-500 pl-3">
                      <p className="font-semibold">{breach.name}</p>
                      <p className="text-sm text-gray-600">{breach.date}</p>
                      <p className="text-sm">{breach.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Redes Sociais */}
          <Card>
            <CardHeader>
              <CardTitle>Perfis em Redes Sociais</CardTitle>
            </Header>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(result.socialMedia).map(([platform, url]: [string, string]) => (
                  <div key={platform} className="flex justify-between items-center">
                    <span className="capitalize">{platform}</span>
                    <a
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Ver perfil →
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// Componente: Verificação KYC
// ============================================

function VerificacaoKYC() {
  const { tipo, setTipo, documento, setDocumento, nome, setNome, loading, result, error, handleVerify } = useVerificacaoKyc();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Verificação KYC/KYB</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <div className="flex gap-4">
                <Button
                  variant={tipo === 'PJ' ? 'default' : 'outline'}
                  onClick={() => setTipo('PJ')}
                >
                  Pessoa Jurídica
                </Button>
                <Button
                  variant={tipo === 'PF' ? 'default' : 'outline'}
                  onClick={() => setTipo('PF')}
                >
                  Pessoa Física
                </Button>
              </div>
            </div>

            <Input
              placeholder={tipo === 'PJ' ? 'CNPJ' : 'CPF'}
              value={documento}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumento(e.target.value)}
            />

            <Input
              placeholder="Nome ou Razão Social"
              value={nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
            />

            <Button onClick={handleVerify} disabled={loading} className="w-full">
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Verificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Status:</span>
                <span className={`px-4 py-2 rounded font-semibold ${
                  result.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : result.status === 'REVIEW'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
              </div>

              {/* Score */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Score de Compliance</p>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      result.score >= 70 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
                <p className="text-right text-sm mt-1">{result.score}/100</p>
              </div>

              {/* Checks */}
              <div>
                <p className="font-semibold mb-2">Verificações:</p>
                <div className="space-y-2">
                  {Object.entries(result.checks).map(([key, value]: [string, boolean]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value ? '✓' : '✗'}
                      </span>
                      <span className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendações */}
              {result.recommendations.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Recomendações:</p>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
